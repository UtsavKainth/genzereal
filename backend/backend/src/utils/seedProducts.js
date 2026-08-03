import "dotenv/config";
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { connectDB } from "../config/db.js";
import Product from "../models/Product.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appFilePath = path.resolve(
  __dirname,
  "../../../../frontend/frontend/src/App.jsx"
);

function extractProductsArray(source) {
  const marker = "const PRODUCTS =";
  const markerIndex = source.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error("Could not find const PRODUCTS in App.jsx");
  }

  const arrayStart = source.indexOf("[", markerIndex);

  if (arrayStart === -1) {
    throw new Error("Could not find PRODUCTS array opening bracket");
  }

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = arrayStart; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === "\\") {
        escaped = true;
        continue;
      }

      if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (
      character === '"' ||
      character === "'" ||
      character === "`"
    ) {
      quote = character;
      continue;
    }

    if (character === "[") {
      depth += 1;
    }

    if (character === "]") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(arrayStart, index + 1);
      }
    }
  }

  throw new Error("Could not find PRODUCTS array closing bracket");
}

async function seedProducts() {
  try {
    if (!fs.existsSync(appFilePath)) {
      throw new Error(`App.jsx not found at: ${appFilePath}`);
    }

    const appSource = fs.readFileSync(appFilePath, "utf8");
    const productsArrayCode = extractProductsArray(appSource);

    const products = vm.runInNewContext(
      `(${productsArrayCode})`,
      {},
      {
        timeout: 5000,
      }
    );

    if (!Array.isArray(products) || products.length === 0) {
      throw new Error("No products were found in App.jsx");
    }

    await connectDB();

    const operations = products.map((product) => {
      const sizes = [
        { size: "S", stock: 10 },
        { size: "M", stock: 10 },
        { size: "L", stock: 10 },
        { size: "XL", stock: 10 },
      ];

      return {
        updateOne: {
          filter: {
            id: Number(product.id),
          },

          update: {
            $set: {
              id: Number(product.id),
              name: String(product.name || "").trim(),
              cat: String(product.cat || "").trim(),
              price: Number(product.price || 0),
              mrp:
                product.mrp === null ||
                product.mrp === undefined
                  ? null
                  : Number(product.mrp),
              tag: product.tag || null,
              rating: Number(product.rating || 0),
              g: Number(product.g || 0),
              mark: String(product.mark || "").trim(),
              images: Array.isArray(product.images)
                ? product.images
                : [],
              desc: String(product.desc || "").trim(),
              sizes,
              totalStock: 40,
              active: true,
              featured: Number(product.id) === 3,
              bestseller: false,
            },
          },

          upsert: true,
        },
      };
    });

    const result = await Product.bulkWrite(operations);

    console.log("");
    console.log("✅ Product seeding completed");
    console.log(`📦 Products found: ${products.length}`);
    console.log(`➕ Products inserted: ${result.upsertedCount}`);
    console.log(`🔄 Products updated: ${result.modifiedCount}`);
    console.log("");

    process.exit(0);
  } catch (error) {
    console.error("❌ Product seeding failed:", error.message);
    process.exit(1);
  }
}

seedProducts();