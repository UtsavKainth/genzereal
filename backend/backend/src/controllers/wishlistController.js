export async function getWishlist(req, res) { res.json({ wishlist: req.user.wishlist || [] }); }
export async function addWishlist(req, res) {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId)) return res.status(400).json({ message: "Invalid product id" });
  if (!req.user.wishlist.includes(productId)) req.user.wishlist.push(productId);
  await req.user.save();
  res.json({ wishlist: req.user.wishlist });
}
export async function removeWishlist(req, res) {
  const productId = Number(req.params.productId);
  req.user.wishlist = req.user.wishlist.filter(id => id !== productId);
  await req.user.save();
  res.json({ wishlist: req.user.wishlist });
}
