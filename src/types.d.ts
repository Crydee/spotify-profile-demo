interface UserProfile {
    country: string;
    display_name: string;
    email: string;
    explicit_content: {
        filter_enabled: boolean,
        filter_locked: boolean
    },
    external_urls: { spotify: string; };
    followers: { href: string; total: number; };
    href: string;
    id: string;
    images: Image[];
    product: string;
    type: string;
    uri: string;
}

interface Image {
    url: string;
    height: number;
    width: number;
}

interface SimplifiedPlaylistObject {
  collaborative: boolean;
  description: string;
  external_urls: { spotify: string; };
  href: string;
  id: string;
  images: Image[];
  name: string;
  owner: {
    external_urls: { spotify: string; };
    followers: { href: string; total: number; },
    href: string;
    id: string;
    type: string;
    uri: string;
    display_name: string;
  };
  pubic: boolean;
  snapshot_id: string;
  tracks: { href: string; total: nuber; };
  type: string;
  uri: string;
}
//TODO Properly type 'items'
