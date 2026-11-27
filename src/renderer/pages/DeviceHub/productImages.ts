// İsteğe bağlı ürün görseli eşlemesi. Varsayılan olarak boştur: kart kategori ikonunu gösterir.
// Kendi görsellerinizi eklemek için (renderer assets klasörüne koyup import ederek):
//   import blackshark from '../../assets/devices/razer-blackshark-v3x.png'
//   registerProductImage({ vendorId: '1532', productId: 'xxxx' }, blackshark)
//   registerProductImage({ nameIncludes: 'BlackShark V3 X' }, blackshark)
import type { DeviceInfo } from '../../../shared/device-hub/types';

export interface ProductImageMatcher {
  vendorId?: string;
  productId?: string;
  nameIncludes?: string;
}

const entries: Array<{ matcher: ProductImageMatcher; src: string }> = [];

export function registerProductImage(matcher: ProductImageMatcher, src: string): void {
  entries.push({ matcher, src });
}

export function getProductImage(device: DeviceInfo): string | null {
  for (const { matcher, src } of entries) {
    if (matcher.vendorId && matcher.vendorId.toLowerCase() !== device.vendorId) continue;
    if (matcher.productId && matcher.productId.toLowerCase() !== device.productId) continue;
    if (matcher.nameIncludes && !device.displayName.toLowerCase().includes(matcher.nameIncludes.toLowerCase())) continue;
    if (!matcher.vendorId && !matcher.productId && !matcher.nameIncludes) continue;
    return src;
  }
  return null;
}
