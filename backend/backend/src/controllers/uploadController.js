export async function uploadProductImages(req, res) {
  try {
    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length === 0) {
      return res.status(400).json({
        message: "Please select at least one image",
      });
    }

    const images = files.map((file) => ({
      url: file.path,
      publicId: file.filename,
    }));

    return res.status(201).json({
      message: "Images uploaded successfully",
      images,
    });
  } catch (error) {
    console.error("Cloudinary image upload failed:", error);

    return res.status(500).json({
      message: "Unable to upload images",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}