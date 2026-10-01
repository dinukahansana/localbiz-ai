import { languages, platforms, tones } from '../models/Campaign.js';

function readBody(input, errors) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    errors.form = 'Send a JSON object with the campaign fields.';
    return {};
  }
  return input;
}

function text(body, key, maxLength, errors, field = key) {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    errors[field] = 'This field is required and must be text.';
    return '';
  }
  if (value.trim().length > maxLength) errors[field] = `Use ${maxLength} characters or fewer.`;
  return value.trim();
}

export function validateBrief(input) {
  const errors = {};
  const body = readBody(input, errors);
  const data = {
    productId: text(body, 'productId', 24, errors),
    goal: text(body, 'goal', 600, errors),
    audience: text(body, 'audience', 300, errors),
    platform: text(body, 'platform', 20, errors),
    tone: text(body, 'tone', 20, errors),
    language: text(body, 'language', 20, errors),
  };
  if (!/^[a-f\d]{24}$/i.test(data.productId)) errors.productId = 'Choose a saved product.';
  if (!platforms.includes(data.platform)) errors.platform = 'Choose Facebook or Instagram.';
  if (!tones.includes(data.tone)) errors.tone = 'Choose a tone from the list.';
  if (!languages.includes(data.language)) errors.language = 'Choose English, Sinhala, or Tamil.';
  return { data, errors };
}

// Treat model output and browser edits as untrusted input, and pick only editable fields.
export function validateContent(input) {
  const errors = {};
  const body = readBody(input, errors);
  const data = { title: text(body, 'title', 100, errors), posts: [] };
  if (!Array.isArray(body.posts) || body.posts.length !== 3) {
    errors.posts = 'A campaign must contain exactly three post ideas.';
    return { data, errors };
  }
  data.posts = body.posts.map((inputPost, index) => {
    const prefix = `posts.${index}`;
    const post = readBody(inputPost, errors);
    const result = {
      angle: text(post, 'angle', 80, errors, `${prefix}.angle`),
      caption: text(post, 'caption', 2200, errors, `${prefix}.caption`),
      callToAction: text(post, 'callToAction', 200, errors, `${prefix}.callToAction`),
      imageIdea: text(post, 'imageIdea', 600, errors, `${prefix}.imageIdea`),
      hashtags: [],
    };
    if (!Array.isArray(post.hashtags) || post.hashtags.length < 1 || post.hashtags.length > 12) {
      errors[`${prefix}.hashtags`] = 'Use 1–12 hashtags.';
    } else if (
      post.hashtags.some(
        (tag) => typeof tag !== 'string' || !/^#[\p{L}\p{M}\p{N}_]{1,59}$/u.test(tag.trim()),
      )
    ) {
      errors[`${prefix}.hashtags`] =
        'Use hashtags starting with # and no spaces (up to 60 characters).';
    } else {
      result.hashtags = [...new Set(post.hashtags.map((tag) => tag.trim()))];
    }
    return result;
  });
  return { data, errors };
}
