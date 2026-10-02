import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import Campaign from '../models/Campaign.js';
import CampaignPoster from '../models/CampaignPoster.js';
import PostSchedule from '../models/PostSchedule.js';
import Product from '../models/Product.js';
import BusinessProfile from '../models/BusinessProfile.js';
import { validateBrief, validateContent } from '../validation/campaigns.js';
import { generateCampaign, GenerationError } from '../lib/gemini.js';
import { env } from '../config/env.js';

export function publicCampaign(campaign) {
  return {
    id: campaign._id.toString(),
    productId: campaign.product.toString(),
    productName: campaign.productName,
    businessName: campaign.businessName,
    goal: campaign.goal,
    audience: campaign.audience,
    platform: campaign.platform,
    tone: campaign.tone,
    language: campaign.language,
    title: campaign.title,
    posts: campaign.posts.map(({ angle, caption, callToAction, hashtags, imageIdea }) => ({
      angle,
      caption,
      callToAction,
      hashtags,
      imageIdea,
    })),
    status: 'draft',
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

function invalid(response, errors) {
  return response
    .status(400)
    .json({ error: 'Please check the highlighted fields.', fields: errors });
}

// Factory lets integration tests replace the paid/external call without changing production behavior.
export default function createCampaignRouter(generate = generateCampaign) {
  const router = Router();
  const generationLimit = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 5,
    keyGenerator: (request) => request.user._id.toString(),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'You have made five generation requests. Please wait ten minutes before trying again.',
      code: 'GENERATION_RATE_LIMITED',
    },
  });
  // Prevent double-clicks or multiple tabs from running concurrent calls for one account.
  const generating = new Set();

  router.get('/config', (request, response) =>
    response.json({ configured: Boolean(env.geminiKey) }),
  );

  async function prepareBrief(request, response, next) {
    const { data, errors } = validateBrief(request.body);
    if (Object.keys(errors).length) return invalid(response, errors);
    const product = await Product.findOne({ _id: data.productId, owner: request.user._id }).lean();
    if (!product)
      return response
        .status(404)
        .json({ error: 'Product not found. Refresh your catalog and choose a saved product.' });
    const profile = await BusinessProfile.findOne({ owner: request.user._id }).lean();
    if (!profile)
      return response.status(409).json({
        error: 'Save your business profile before creating a campaign.',
        code: 'PROFILE_REQUIRED',
      });
    request.campaignContext = { brief: data, profile, product };
    next();
  }

  router.post('/generate', prepareBrief, generationLimit, async (request, response) => {
    const owner = request.user._id.toString();
    if (generating.has(owner))
      return response.status(409).json({
        error: 'A campaign is already being generated. Please wait for it to finish.',
        code: 'GENERATION_IN_PROGRESS',
      });
    generating.add(owner);
    try {
      const draft = await generate(request.campaignContext);
      response.json({ draft, brief: request.campaignContext.brief });
    } catch (error) {
      if (!(error instanceof GenerationError)) throw error;
      response.status(error.status).json({ error: error.message, code: error.code });
    } finally {
      generating.delete(owner);
    }
  });

  router.get('/', async (request, response) => {
    const campaigns = await Campaign.find({ owner: request.user._id })
      .sort({ createdAt: -1, _id: -1 })
      .lean();
    response.json({ campaigns: campaigns.map(publicCampaign), total: campaigns.length });
  });

  router.post('/', prepareBrief, async (request, response) => {
    const { data, errors } = validateContent(request.body);
    if (Object.keys(errors).length) return invalid(response, errors);
    const { brief, product, profile } = request.campaignContext;
    const { productId, ...details } = brief;
    const campaign = await Campaign.create({
      ...details,
      ...data,
      owner: request.user._id,
      product: productId,
      productName: product.name,
      businessName: profile.name,
    });
    response.status(201).json({ campaign: publicCampaign(campaign) });
  });

  router.param('id', (request, response, next, id) => {
    if (!/^[a-f\d]{24}$/i.test(id))
      return response.status(400).json({ error: 'Invalid campaign ID.' });
    next();
  });
  router.get('/:id', async (request, response) => {
    const campaign = await Campaign.findOne({
      _id: request.params.id,
      owner: request.user._id,
    }).lean();
    if (!campaign) return response.status(404).json({ error: 'Campaign not found.' });
    response.json({ campaign: publicCampaign(campaign) });
  });
  router.put('/:id', async (request, response) => {
    const { data, errors } = validateContent(request.body);
    if (Object.keys(errors).length) return invalid(response, errors);
    const campaign = await Campaign.findOneAndUpdate(
      { _id: request.params.id, owner: request.user._id },
      { $set: data },
      { returnDocument: 'after', runValidators: true },
    );
    if (!campaign) return response.status(404).json({ error: 'Campaign not found.' });
    response.json({ campaign: publicCampaign(campaign) });
  });
  router.delete('/:id', async (request, response) => {
    const campaign = await Campaign.findOneAndDelete({
      _id: request.params.id,
      owner: request.user._id,
    });
    if (!campaign) return response.status(404).json({ error: 'Campaign not found.' });
    await CampaignPoster.deleteMany({ campaign: campaign._id, owner: request.user._id });
    await PostSchedule.deleteMany({ campaign: campaign._id, owner: request.user._id });
    response.status(204).end();
  });
  return router;
}
