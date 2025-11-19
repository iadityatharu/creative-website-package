import { Product as ProductEntity } from "../../entities/product.entity";

export function stripDeletedRelations(product: ProductEntity): ProductEntity {
  if (product.subcategory && product.subcategory.isDeleted) {
    product.subcategory = null;
  }

  if (Array.isArray(product.gallery)) {
    product.gallery = product.gallery
      .filter((gallery) => !gallery.isDeleted)
      .map((gallery) => {
        if (Array.isArray(gallery.mediaAsset)) {
          gallery.mediaAsset = gallery.mediaAsset.filter(
            (asset) => !asset.isDeleted
          );
        }
        return gallery;
      });
  }

  if (Array.isArray(product.videos)) {
    product.videos = product.videos.filter((video) => !video.isDeleted);
  }

  if (Array.isArray(product.downloadCategories)) {
    product.downloadCategories = product.downloadCategories
      .filter((category) => !category.isDeleted)
      .map((category) => {
        if (Array.isArray(category.items)) {
          category.items = category.items.filter((item) => !item.isDeleted);
        }
        return category;
      });
  }

  if (Array.isArray(product.downloads)) {
    product.downloads = product.downloads.filter(
      (download) => !download.isDeleted
    );
  }

  return product;
}
