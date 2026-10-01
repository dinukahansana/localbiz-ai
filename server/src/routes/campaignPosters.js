import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import Campaign from '../models/Campaign.js';
import CampaignPoster from '../models/CampaignPoster.js';
import { normalizePoster, publicPoster, validatePoster } from '../lib/posters.js';

export default function createPosterRouter() {
  const router = Router();
  const saveLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    keyGenerator: (request) => request.user._id.toString(),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'You have saved 30 posters. Please wait fifteen minutes before saving again.',
    },
  });

  router.param('campaignId', async (request, response, next, id) => {
    if (!/^[a-f\d]{24}$/i.test(id))
      return response.status(400).json({ error: 'Invalid campaign ID.' });
    const campaign = await Campaign.findOne({ _id: id, owner: request.user._id }).select('_id');
    if (!campaign) return response.status(404).json({ error: 'Campaign not found.' });
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
    };
  }
  router.get('/:campaignId', async (request, response) => {
    const posters = await CampaignPoster.find({
      owner: request.user._id,
      campaign: request.params.campaignId,
    })
      .sort({ postIndex: 1 })
      .lean();
    response.json({ posters: posters.map(publicPoster) });
  });
  router.get('/:campaignId/:postIndex', async (request, response) => {
    const poster = await CampaignPoster.findOne(filter(request)).select('+data');
    if (!poster) return response.status(404).json({ error: 'Poster not found.' });
    response.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `${request.query.download === '1' ? 'attachment' : 'inline'}; filename="localbiz-post-${poster.postIndex + 1}.png"`,
    });
    response.send(Buffer.from(poster.data));
  });
  router.put('/:campaignId/:postIndex', saveLimit, async (request, response) => {
    const { data, errors } = validatePoster(request.body);
    if (Object.keys(errors).length)
      return response.status(400).json({ error: 'Please check your poster.', fields: errors });
    let bytes;
    try {
      bytes = await normalizePoster(data.bytes);
    } catch {
      return response
        .status(400)
        .json({ error: 'Invalid poster. Create a new 1080 × 1080 PNG and try again.' });
    }
    const poster = await CampaignPoster.findOneAndUpdate(
      filter(request),
      {
        $set: {
          headline: data.headline,
          callToAction: data.callToAction,
          brandColor: data.brandColor,
          data: bytes,
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
    );
    // A campaign might be deleted in another tab while an image is being decoded.
    const exists = await Campaign.exists({
      _id: request.params.campaignId,
      owner: request.user._id,
    });
    if (!exists) {
      await CampaignPoster.deleteMany({
        campaign: request.params.campaignId,
        owner: request.user._id,
      });
      return response.status(404).json({ error: 'Campaign not found.' });
    }
    response.json({ poster: publicPoster(poster) });
  });
  return router;
}
