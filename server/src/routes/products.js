import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import Product from '../models/Product.js';
import { validateProduct } from '../validation/workspace.js';
import { productPhotoChanges } from '../lib/productPhotos.js';

const router = Router();
const photoLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: (request) => request.user._id.toString(),
  skip: (request) => request.body?.photo === undefined,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Too many photo saves. Wait fifteen minutes before trying again.',
  },
});

function publicProduct(product) {
  return {
    id: product._id.toString(),
    name: product.name,
    category: product.category,
    description: product.description,
    price: (product.priceMinor / 100).toFixed(2),
    currency: product.currency,
    imageUrl: product.imageUrl,
    hasPhoto: Boolean(product.photoVersion),
    photoVersion: product.photoVersion || '',
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

router.param('id', (request, response, next, id) => {
  if (!/^[a-f\d]{24}$/i.test(id))
    return response.status(400).json({ error: 'Invalid product ID.' });
  next();
});

router.get('/', async (request, response) => {
  const products = await Product.find({ owner: request.user._id })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
  response.json({
    products: products.map(publicProduct),
    total: products.length,
  });
});

router.get('/:id', async (request, response) => {
  const product = await Product.findOne({
    _id: request.params.id,
    owner: request.user._id,
  }).lean();
  if (!product) return response.status(404).json({ error: 'Product not found.' });
  response.json({ product: publicProduct(product) });
});

router.get('/:id/photo', async (request, response) => {
  const product = await Product.findOne({
    _id: request.params.id,
    owner: request.user._id,
  }).select('+photoData');
  if (!product?.photoData?.length)
    return response.status(404).json({ error: 'Product photo not found.' });
  response.type('image/jpeg').send(Buffer.from(product.photoData));
});

async function readProduct(body) {
  const result = validateProduct(body);
  if (!Object.keys(result.errors).length) {
    try {
      Object.assign(result.data, await productPhotoChanges(body.photo));
    } catch (error) {
      result.errors.photo = error.message;
    }
  }
  return result;
}

router.post('/', photoLimit, async (request, response) => {
  const { data, errors } = await readProduct(request.body);
  if (Object.keys(errors).length) {
    return response
      .status(400)
      .json({ error: 'Please check the highlighted fields.', fields: errors });
  }
  const product = await Product.create({ ...data, owner: request.user._id });
  response.status(201).json({ product: publicProduct(product) });
});

// PUT replaces the editable fields. IDs and timestamps always stay server-controlled.
router.put('/:id', photoLimit, async (request, response) => {
  if (!(await Product.exists({ _id: request.params.id, owner: request.user._id })))
    return response.status(404).json({ error: 'Product not found.' });
  const { data, errors } = await readProduct(request.body);
  if (Object.keys(errors).length) {
    return response
      .status(400)
      .json({ error: 'Please check the highlighted fields.', fields: errors });
  }
  const product = await Product.findOneAndUpdate(
    { _id: request.params.id, owner: request.user._id },
    { $set: data },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  );
  if (!product) return response.status(404).json({ error: 'Product not found.' });
  response.json({ product: publicProduct(product) });
});

router.delete('/:id', async (request, response) => {
  const product = await Product.findOneAndDelete({
    _id: request.params.id,
    owner: request.user._id,
  });
  if (!product) return response.status(404).json({ error: 'Product not found.' });
  response.status(204).end();
});

export default router;
