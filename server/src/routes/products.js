import { Router } from 'express';
import Product from '../models/Product.js';
import { validateProduct } from '../validation/workspace.js';

const router = Router();

function publicProduct(product) {
  return {
    id: product._id.toString(),
    name: product.name,
    category: product.category,
    description: product.description,
    price: (product.priceMinor / 100).toFixed(2),
    currency: product.currency,
    imageUrl: product.imageUrl,
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
  const products = await Product.find().sort({ createdAt: -1, _id: -1 }).lean();
  response.json({ products: products.map(publicProduct), total: products.length });
});

router.get('/:id', async (request, response) => {
  const product = await Product.findById(request.params.id).lean();
  if (!product) return response.status(404).json({ error: 'Product not found.' });
  response.json({ product: publicProduct(product) });
});

router.post('/', async (request, response) => {
  const { data, errors } = validateProduct(request.body);
  if (Object.keys(errors).length) {
    return response
      .status(400)
      .json({ error: 'Please check the highlighted fields.', fields: errors });
  }
  const product = await Product.create(data);
  response.status(201).json({ product: publicProduct(product) });
});

// PUT replaces the editable fields. IDs and timestamps always stay server-controlled.
router.put('/:id', async (request, response) => {
  const { data, errors } = validateProduct(request.body);
  if (Object.keys(errors).length) {
    return response
      .status(400)
      .json({ error: 'Please check the highlighted fields.', fields: errors });
  }
  const product = await Product.findByIdAndUpdate(
    request.params.id,
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
  const product = await Product.findByIdAndDelete(request.params.id);
  if (!product) return response.status(404).json({ error: 'Product not found.' });
  response.status(204).end();
});

export default router;
