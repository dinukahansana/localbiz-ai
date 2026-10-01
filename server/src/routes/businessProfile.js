import { Router } from 'express';
import BusinessProfile from '../models/BusinessProfile.js';
import { validateProfile } from '../validation/workspace.js';

const router = Router();

function publicProfile(profile) {
  if (!profile) return null;
  return {
    name: profile.name,
    category: profile.category,
    location: profile.location,
    story: profile.story,
    updatedAt: profile.updatedAt,
  };
}

router.get('/', async (request, response) => {
  const profile = await BusinessProfile.findById('primary').lean();
  response.json({ profile: publicProfile(profile) });
});

router.put('/', async (request, response) => {
  const { data, errors } = validateProfile(request.body);
  if (Object.keys(errors).length) {
    return response
      .status(400)
      .json({ error: 'Please check the highlighted fields.', fields: errors });
  }
  const profile = await BusinessProfile.findOneAndUpdate(
    { _id: 'primary' },
    { $set: data },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
  response.json({ profile: publicProfile(profile) });
});

export default router;
