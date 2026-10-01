import { currencies } from '../models/Product.js';

function readText(body, key, label, maxLength, required, errors) {
  const value = body[key] ?? '';
  if (typeof value !== 'string') {
    errors[key] = `${label} must be text.`;
    return '';
  }
  const trimmed = value.trim();
  if (required && !trimmed) errors[key] = `${label} is required.`;
  else if (trimmed.length > maxLength) errors[key] = `Use ${maxLength} characters or fewer.`;
  return trimmed;
}

function readBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { body: {}, errors: { form: 'Send a JSON object with the form fields.' } };
  }
  return { body, errors: {} };
}

export function validateProfile(input) {
  const { body, errors } = readBody(input);
  // Pick explicit fields; never pass a request body or MongoDB operators to a model.
  const data = {
    name: readText(body, 'name', 'Business name', 100, true, errors),
    category: readText(body, 'category', 'Category', 60, true, errors),
    location: readText(body, 'location', 'Location', 160, false, errors),
    story: readText(body, 'story', 'Your story', 2000, false, errors),
  };
  return { data, errors };
}

export function validateProduct(input) {
  const { body, errors } = readBody(input);
  const data = {
    name: readText(body, 'name', 'Product name', 100, true, errors),
    category: readText(body, 'category', 'Category', 60, false, errors),
    description: readText(body, 'description', 'Description', 2000, false, errors),
    currency: readText(body, 'currency', 'Currency', 3, true, errors),
    imageUrl: readText(body, 'imageUrl', 'Image URL', 2048, false, errors),
  };

  if (!currencies.includes(data.currency)) errors.currency = 'Choose LKR, USD, EUR, GBP, or INR.';

  // Accept a decimal string or number. Reject negatives, exponents, and extra decimals.
  const price = typeof body.price === 'number' ? String(body.price) : body.price;
  if (typeof price !== 'string' || !/^\d{1,7}(\.\d{1,2})?$/.test(price.trim())) {
    errors.price = 'Enter a price from 0 to 9,999,999.99 with up to two decimal places.';
  } else {
    const [whole, fraction = ''] = price.trim().split('.');
    data.priceMinor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  }

  if (data.imageUrl) {
    try {
      const url = new URL(data.imageUrl);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        errors.imageUrl = 'Use a public http or https image URL without credentials.';
      }
    } catch {
      errors.imageUrl = 'Enter a valid image URL, or leave it blank.';
    }
  }
  return { data, errors };
}
