import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import Campaign from '../models/Campaign.js';
import Product from '../models/Product.js';
import PosterGeneration, { ImageBudget } from '../models/PosterGeneration.js';
import { env } from '../config/env.js';
import { createDeapiProvider, editModel, textModel, ImageGenerationError } from '../lib/deapi.js';
import {
  validateAiPoster,
  prepareReference,
  buildPosterPrompt,
  normalizeGeneratedPoster,
  publicGeneration,
} from '../lib/aiPosters.js';

async function reserveBudget(id, limit) {
  await ImageBudget.updateOne(
    { _id: id },
    { $setOnInsert: { used: 0, expiresAt: new Date(Date.now() + 3 * 86400000) } },
    { upsert: true },
  );
  return ImageBudget.findOneAndUpdate({ _id: id, used: { $lt: limit } }, { $inc: { used: 1 } });
}

export default function createGenerationRouter(provider = createDeapiProvider()) {
  const router = Router();
  const attemptLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    keyGenerator: (request) => request.user._id.toString(),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many image requests. Wait fifteen minutes before trying again.' },
  });
  router.get('/config', (request, response) =>
    response.json({
      configured: provider.configured,
      maxPrice: env.deapiMaxPrice,
      dailyLimit: env.deapiDailyLimit,
    }),
  );
  router.param('campaignId', async (request, response, next, id) => {
    if (!/^[a-f\d]{24}$/i.test(id))
      return response.status(400).json({ error: 'Invalid campaign ID.' });
    const campaign = await Campaign.findOne({ _id: id, owner: request.user._id }).lean();
    if (!campaign) return response.status(404).json({ error: 'Campaign not found.' });
    request.campaign = campaign;
    next();
  });
  router.param('postIndex', (request, response, next, index) => {
    if (!/^[0-2]$/.test(index))
      return response.status(400).json({ error: 'Choose post 1, 2, or 3.' });
    next();
  });
  function filter(request) {
    return {
      owner: request.user._id,
      campaign: request.params.campaignId,
      postIndex: Number(request.params.postIndex),
      expiresAt: { $gt: new Date() },
    };
  }
  // Reopening a campaign resumes its latest preview without buying another image.
  router.get('/:campaignId/:postIndex', async (request, response) => {
    const job = await PosterGeneration.findOne(filter(request)).sort({ createdAt: -1 });
    response.json({ generation: job ? publicGeneration(job) : null });
  });
  router.post('/:campaignId/:postIndex', attemptLimit, async (request, response) => {
    const { data, errors } = validateAiPoster(request.body);
    if (Object.keys(errors).length)
      return response
        .status(400)
        .json({ error: 'Please check your AI poster prompt and photo.', fields: errors });
    await PosterGeneration.init();
    const existing = await PosterGeneration.findOne({
      owner: request.user._id,
      requestKey: data.requestKey,
    });
    if (existing) {
      if (
        existing.campaign.toString() !== request.params.campaignId ||
        existing.postIndex !== Number(request.params.postIndex)
      )
        return response
          .status(409)
          .json({ error: 'This request belongs to another poster. Reload this page.' });
      return response.json({ generation: publicGeneration(existing) });
    }
    if (!provider.configured)
      return response.status(503).json({
        error:
          'Add DEAPI_API_KEY to the backend environment and restart it. The free photo template is available meanwhile.',
      });
    let image;
    try {
      image = await prepareReference(data.image);
    } catch {
      return response.status(400).json({
        error:
          'This photo could not be decoded. Choose a valid JPG, PNG, or WebP under 20 million pixels.',
      });
    }
    const product = await Product.findOne({
      _id: request.campaign.product,
      owner: request.user._id,
    }).lean();
    const prompt = buildPosterPrompt({
      campaign: request.campaign,
      product,
      postIndex: Number(request.params.postIndex),
      data,
      reference: Boolean(image),
    });
    let price;
    try {
      price = await provider.quote({ prompt, image });
      if (!Number.isFinite(price) || price <= 0)
        return response.status(503).json({
          error: 'An exact deAPI price is unavailable. No image generation was started.',
          code: 'IMAGE_PRICE_UNAVAILABLE',
        });
      if (price > env.deapiMaxPrice)
        return response.status(409).json({
          error: `deAPI quoted ${price} credits, above your ${env.deapiMaxPrice} credit limit. No image was generated. Your workspace's poster budget needs to be increased to allow this quote.`,
          code: 'IMAGE_PRICE_LIMIT_EXCEEDED',
          quotedPrice: price,
          maxPrice: env.deapiMaxPrice,
        });
    } catch (error) {
      if (!(error instanceof ImageGenerationError)) throw error;
      return response.status(error.status).json({ error: error.message });
    }
    let job;
    try {
      job = await PosterGeneration.create({
        owner: request.user._id,
        campaign: request.params.campaignId,
        postIndex: Number(request.params.postIndex),
        requestKey: data.requestKey,
        model: image ? editModel : textModel,
        headline: data.headline,
        callToAction: data.callToAction,
        brandColor: data.brandColor,
        prompt: data.prompt,
        style: data.style,
        price,
        expiresAt: new Date(Date.now() + 2 * 86400000),
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      const duplicate = await PosterGeneration.findOne({
        owner: request.user._id,
        requestKey: data.requestKey,
      });
      if (
        duplicate &&
        duplicate.campaign.toString() === request.params.campaignId &&
        duplicate.postIndex === Number(request.params.postIndex)
      )
        return response.json({ generation: publicGeneration(duplicate) });
      const message =
        'An AI image is already being generated for your account. Open that post to check its progress.';
      return response.status(409).json({ error: message });
    }
    const hour = new Date().toISOString().slice(0, 13);
    const day = hour.slice(0, 10);
    if (
      !(await reserveBudget(`user:${request.user._id}:${hour}`, 5)) ||
      !(await reserveBudget(`app:${day}`, env.deapiDailyLimit))
    ) {
      job.status = 'error';
      job.active = false;
      job.message =
        'The account hourly limit or app daily image limit has been reached. No generation was started.';
      await job.save();
      return response.status(429).json({ error: job.message, generation: publicGeneration(job) });
    }
    // Persist the reservation BEFORE the charged call. Do not automatically retry submissions.
    try {
      job.providerId = await provider.start({ prompt, image });
      job.status = 'pending';
      await job.save();
    } catch (error) {
      job.status = 'unknown';
      job.active = false;
      job.message =
        'We could not confirm the submission. It may have used credits. Check your deAPI dashboard before starting another image.';
      await job.save();
      if (!(error instanceof ImageGenerationError)) throw error;
    }
    response.status(202).json({ generation: publicGeneration(job) });
  });
  router.param('jobId', (request, response, next, id) => {
    if (!/^[a-f\d]{24}$/i.test(id))
      return response.status(400).json({ error: 'Invalid image job ID.' });
    next();
  });
  router.get('/:campaignId/:postIndex/:jobId', async (request, response) => {
    const match = { ...filter(request), _id: request.params.jobId };
    let job = await PosterGeneration.findOne(match).select('+providerId');
    if (!job) return response.status(404).json({ error: 'Image preview not found or expired.' });
    if (job.status === 'starting' && Date.now() - job.createdAt.getTime() > 60000) {
      job.status = 'unknown';
      job.active = false;
      job.message =
        'Submission was interrupted. Check your deAPI dashboard before generating again.';
      await job.save();
    }
    if (['pending', 'processing'].includes(job.status)) {
      // A short persisted lease avoids duplicate polling/downloads from multiple tabs.
      const leased = await PosterGeneration.findOneAndUpdate(
        {
          ...match,
          checkedAt: { $lt: new Date(Date.now() - 60000) },
          status: { $in: ['pending', 'processing'] },
        },
        { $set: { checkedAt: new Date() } },
        { returnDocument: 'after' },
      ).select('+providerId');
      if (leased) {
        try {
          const result = await provider.check(leased.providerId);
          const patch = {
            status: result.status,
            progress: result.progress,
            message: result.message || '',
            active: ['pending', 'processing'].includes(result.status),
            checkedAt: new Date(Date.now() - 57000),
          };
          if (result.status === 'done') {
            try {
              patch.data = await normalizeGeneratedPoster(await provider.download(result.url));
            } catch (error) {
              if (error instanceof ImageGenerationError) throw error;
              throw new ImageGenerationError(
                502,
                'deAPI returned an invalid image. Check the current job in its dashboard.',
              );
            }
            patch.progress = 100;
          }
          job = await PosterGeneration.findOneAndUpdate(
            match,
            { $set: patch },
            { returnDocument: 'after' },
          );
          if (!job) return response.status(404).json({ error: 'Image preview not found.' });
          // Deletion in another tab must not leave newly downloaded private bytes behind.
          if (
            !(await Campaign.exists({ _id: request.params.campaignId, owner: request.user._id }))
          ) {
            await PosterGeneration.deleteMany({
              campaign: request.params.campaignId,
              owner: request.user._id,
            });
            return response.status(404).json({ error: 'Campaign not found.' });
          }
        } catch (error) {
          if (!(error instanceof ImageGenerationError)) throw error;
          await PosterGeneration.updateOne(match, {
            $set: { checkedAt: new Date(Date.now() - 57000) },
          });
          return response.status(error.status).json({ error: error.message });
        }
      }
    }
    response.json({ generation: publicGeneration(job) });
  });
  router.get('/:campaignId/:postIndex/:jobId/image', async (request, response) => {
    const job = await PosterGeneration.findOne({
      ...filter(request),
      _id: request.params.jobId,
      status: 'done',
    }).select('+data');
    if (!job?.data)
      return response.status(404).json({ error: 'Completed image preview not found.' });
    response.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `inline; filename="localbiz-ai-post-${job.postIndex + 1}.png"`,
    });
    response.send(Buffer.from(job.data));
  });
  return router;
}
