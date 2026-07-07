import { test, expect, describe } from 'bun:test';
import { parseDumpKeychain } from '../../main/services/keychain-list';

// Fixture mirrors real `security dump-keychain` output: attribute-only item
// blocks, including a hex-encoded svce blob from an unrelated service.
const DUMP = `keychain: "/Users/x/Library/Keychains/login.keychain-db"
version: 512
class: "genp"
attributes:
    0x00000007 <blob>=0x416972506F7274  "AirPort"
    "acct"<blob>="some-wifi"
    "svce"<blob>=0x416972506F7274  "AirPort"
keychain: "/Users/x/Library/Keychains/login.keychain-db"
version: 512
class: "genp"
attributes:
    0x00000007 <blob>="wallet-addr-book"
    "acct"<blob>="0x4Cf0A877E906DEaD748A41aE7DA8c220E4247D9e"
    "desc"<blob>=<NULL>
    "svce"<blob>="wallet-addr-book"
    "type"<uint32>=<NULL>
keychain: "/Users/x/Library/Keychains/login.keychain-db"
version: 512
class: "genp"
attributes:
    "acct"<blob>="other-account"
    "svce"<blob>="some-other-service"
keychain: "/Users/x/Library/Keychains/login.keychain-db"
version: 512
class: "genp"
attributes:
    0x00000007 <blob>="wallet-addr-book"
    "acct"<blob>="0xaa7bb948836a067eBb2FDEBb3F29c8fBACE4C169"
    "svce"<blob>="wallet-addr-book"
`;

describe('parseDumpKeychain', () => {
  test('extracts only accounts belonging to the given service', () => {
    expect(parseDumpKeychain(DUMP, 'wallet-addr-book')).toEqual([
      '0x4Cf0A877E906DEaD748A41aE7DA8c220E4247D9e',
      '0xaa7bb948836a067eBb2FDEBb3F29c8fBACE4C169',
    ]);
  });

  test('returns empty list when no item matches the service', () => {
    expect(parseDumpKeychain(DUMP, 'nonexistent-service')).toEqual([]);
    expect(parseDumpKeychain('', 'wallet-addr-book')).toEqual([]);
  });
});
