import 'mocha';
import { expect } from 'chai';
import {
  extractAddressFromPublicKey,
  extractAddressFromSecret,
  extractPublicKeyFromSecret,
} from '../../src';

describe('tz encoding', () => {
  describe('extractAddressFromSecret', () => {
    it('should extract address from secret', () => {
      const address = extractAddressFromSecret(
        'edskRpthz6CnXsmvknNHAozBJGax6e5Hj9q2bK3j8u4XJRgvAgkGHTvy9Q8ksNsbtMmU2JzsC2wXD3BhMQx346QxWzjDVsTZzG',
      );
      expect(address).to.be.equal('tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6');
    });
  });
  describe('extractPublicKeyFromSecret', () => {
    it('should extract public key from secret', () => {
      const publicKey = extractPublicKeyFromSecret(
        'edskRpthz6CnXsmvknNHAozBJGax6e5Hj9q2bK3j8u4XJRgvAgkGHTvy9Q8ksNsbtMmU2JzsC2wXD3BhMQx346QxWzjDVsTZzG',
      );
      expect(publicKey).to.be.equal(
        'edpkurPsQ8eUApnLUJ9ZPDvu98E8VNj4KtJa1aZr16Cr5ow5VHKnz4',
      );
    });
  });
  describe('extractAddressFromPublicKey', () => {
    it('should extract address from public key', () => {
      const address = extractAddressFromPublicKey(
        'edpkurPsQ8eUApnLUJ9ZPDvu98E8VNj4KtJa1aZr16Cr5ow5VHKnz4',
      );
      expect(address).to.be.equal('tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6');
    });
  });
});
