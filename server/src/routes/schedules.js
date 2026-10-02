import { Router } from 'express';
import Campaign from '../models/Campaign.js';
import PostSchedule from '../models/PostSchedule.js';
import { validateSchedule, validateScheduleDate } from '../validation/schedules.js';

export function publicSchedule(schedule, campaign = schedule.campaign) {
  const post = campaign.posts[schedule.postIndex];
  return {
    id: schedule._id.toString(),
    campaignId: campaign._id.toString(),
    campaignTitle: campaign.title,
    productName: campaign.productName,
    platform: campaign.platform,
    postIndex: schedule.postIndex,
    angle: post.angle,
    caption: post.caption,
    callToAction: post.callToAction,
    hashtags: post.hashtags,
    scheduledFor: schedule.scheduledFor,
    status: schedule.status,
    publishedAt: schedule.publishedAt,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  };
}

function invalid(response, fields) {
  return response.status(400).json({ error: 'Please check your posting plan.', fields });
}

export default function createScheduleRouter() {
  const router = Router();
  const missing = (response) => response.status(404).json({ error: 'Posting plan not found.' });
  async function findCampaign(id, owner) {
    return Campaign.findOne({ _id: id, owner }).select('title productName platform posts').lean();
  }
  router.get('/', async (request, response) => {
    const records = await PostSchedule.find({ owner: request.user._id })
      .populate({
        path: 'campaign',
        match: { owner: request.user._id },
        select: 'title productName platform posts',
      })
      .sort({ scheduledFor: 1, _id: 1 })
      .lean();
    const schedules = records
      .filter((record) => record.campaign)
      .map((record) => publicSchedule(record));
    response.json({
      schedules,
      total: schedules.length,
      scheduledTotal: schedules.filter((record) => record.status === 'scheduled').length,
    });
  });
  router.post('/', async (request, response) => {
    const { data, errors } = validateSchedule(request.body);
    if (Object.keys(errors).length) return invalid(response, errors);
    const campaign = await findCampaign(data.campaign, request.user._id);
    if (!campaign) return response.status(404).json({ error: 'Campaign not found.' });
    let schedule;
    try {
      schedule = await PostSchedule.create({ ...data, owner: request.user._id });
    } catch (error) {
      if (error.code !== 11000) throw error;
      return response
        .status(409)
        .json({ error: 'This post already has a plan. Refresh the page to view it.' });
    }
    if (!(await Campaign.exists({ _id: campaign._id, owner: request.user._id }))) {
      await PostSchedule.deleteMany({ campaign: campaign._id, owner: request.user._id });
      return response.status(404).json({ error: 'Campaign not found.' });
    }
    response.status(201).json({ schedule: publicSchedule(schedule, campaign) });
  });
  router.param('id', (request, response, next, id) => {
    if (!/^[a-f\d]{24}$/i.test(id))
      return response.status(400).json({ error: 'Invalid posting plan ID.' });
    next();
  });
  router.put('/:id', async (request, response) => {
    const { scheduledFor, errors } = validateScheduleDate(request.body);
    if (Object.keys(errors).length) return invalid(response, errors);
    const existing = await PostSchedule.findOne({
      _id: request.params.id,
      owner: request.user._id,
    }).lean();
    if (!existing) return missing(response);
    const campaign = await findCampaign(existing.campaign, request.user._id);
    if (!campaign) return missing(response);
    const schedule = await PostSchedule.findOneAndUpdate(
      {
        _id: existing._id,
        owner: request.user._id,
        status: { $in: ['scheduled', 'cancelled'] },
      },
      { $set: { scheduledFor, status: 'scheduled', publishedAt: null } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!schedule)
      return response.status(409).json({ error: 'Published posts cannot be rescheduled.' });
    response.json({ schedule: publicSchedule(schedule, campaign) });
  });
  router.patch('/:id/status', async (request, response) => {
    const status = request.body?.status;
    if (!['published', 'cancelled'].includes(status))
      return invalid(response, { status: 'Choose published or cancelled.' });
    const existing = await PostSchedule.findOne({
      _id: request.params.id,
      owner: request.user._id,
    }).lean();
    if (!existing) return missing(response);
    const campaign = await findCampaign(existing.campaign, request.user._id);
    if (!campaign) return missing(response);
    // Repeating the same confirmation is safe after a timeout; conflicting transitions are rejected.
    if (existing.status === status)
      return response.json({ schedule: publicSchedule(existing, campaign) });
    const schedule = await PostSchedule.findOneAndUpdate(
      {
        _id: existing._id,
        owner: request.user._id,
        status: 'scheduled',
      },
      { $set: { status, publishedAt: status === 'published' ? new Date() : null } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!schedule)
      return response.status(409).json({ error: 'This plan has changed. Refresh and try again.' });
    response.json({ schedule: publicSchedule(schedule, campaign) });
  });
  return router;
}
