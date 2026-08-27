/** Shapes returned by the Django REST API (see backend serializers). */

export type MediaVariant = {
  id: number;
  url: string;
  width: number;
  height: number;
  image_format: string;
  file_size: number;
};

export type MediaAsset = {
  id: number;
  url: string;
  thumbnail: string | null;
  srcset: string | null;
  sources: Array<{ type: string; srcset: string }>;
  kind: "image" | "video" | "document";
  title: string;
  alt_text: string;
  alt_text_en: string;
  caption: string;
  folder: number | null;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  aspect_ratio: number | null;
  dominant_color: string | null;
  placeholder: string | null;
  variants: MediaVariant[];
  usage_count?: number;
  created_at: string;
  updated_at: string;
};

export type ThemeTokens = Record<string, string>;

export type MotionSettings = {
  style: "minimal" | "elegant" | "cinematic" | "experimental";
  animationSpeed: number;
  parallaxIntensity: number;
  revealPreset: string;
  hoverPreset: string;
  pageTransition: string;
  easing: string;
  particles: boolean;
  grain: boolean;
};

export type ResolvedTheme = {
  themeKey: string;
  themeName: string;
  mode: "day" | "night";
  modeStrategy: string;
  season: string;
  seasonWord: string;
  seasonIcon: string;
  seasonParticle: string;
  seasonStrategy: string;
  allowVisitorOverride: boolean;
  dataAttributes: Record<string, string>;
  colorScheme: string;
  tokens: ThemeTokens;
  motion: MotionSettings;
  galleryLayout: GalleryLayout;
  cursorStyle: "none" | "dot" | "ring" | "cross";
  buttonStyle: string;
  cardStyle: string;
};

export type GalleryLayout =
  | "masonry"
  | "editorial"
  | "minimal"
  | "large_cards"
  | "asymmetric"
  | "fullscreen";

export type ThemeSummary = {
  id: number;
  key: string;
  name: string;
  name_en: string;
  note: string;
  swatch: string[];
  is_active: boolean;
  is_builtin: boolean;
  gallery_layout: GalleryLayout;
  motion_style: string;
  order: number;
};

export type Season = {
  id: number;
  key: string;
  name: string;
  name_en: string;
  icon: string;
  word: string;
  particle: string;
  is_active: boolean;
};

export type NavItem = {
  id: number;
  label: string;
  label_en: string;
  url: string;
  location: "header" | "mobile" | "footer";
  is_active: boolean;
  open_in_new_tab: boolean;
  parent: number | null;
  order: number;
};

export type SocialLink = {
  id: number;
  platform: string;
  label: string;
  url: string;
  is_active: boolean;
  order: number;
};

export type SiteSetting = {
  site_name: string;
  site_name_en: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  studio_note: string;
  map_url: string;
  default_gallery_layout: GalleryLayout;
  artworks_per_page: number;
  show_prices: boolean;
  enable_intro_loader: boolean;
  enable_custom_cursor: boolean;
  enable_page_transitions: boolean;
  default_language: string;
  enable_english: boolean;
  default_seo_title: string;
  default_seo_description: string;
  default_og_image: MediaAsset | null;
  maintenance_mode: boolean;
  maintenance_message: string;
};

export type Artist = {
  id: number;
  name: string;
  name_latin: string;
  role: string;
  role_en: string;
  city: string;
  birth_year: number | null;
  hero_lines: string[];
  hero_caption: string;
  hero_cta_label: string;
  hero_cta_url: string;
  about_title: string;
  biography: string;
  biography_en: string;
  statement: string;
  philosophy: string;
  spotlight_quote: string;
  spotlight_meta: string;
  email: string;
  phone: string;
  studio_address: string;
  portrait: MediaAsset | null;
  studio_image: MediaAsset | null;
  cv_file: string | null;
};

export type Category = {
  id: number;
  key: string;
  label: string;
  label_en: string;
  description: string;
  order: number;
  artwork_count?: number;
};

export type ArtworkImage = {
  alt_override?: string;
  id: number;
  artwork?: number;
  image: MediaAsset | null;
  role: "main" | "detail" | "context" | "process";
  caption: string;
  alt_text: string;
  is_cover: boolean;
  order: number;
};

export type Artwork = {
  id: number;
  slug: string;
  title: string;
  title_en: string;
  category: Category | null;
  collection: { id: number; slug: string; title: string } | null;
  year: string;
  technique: string;
  material: string;
  medium: string;
  dimensions: string;
  availability: string;
  availability_label: string;
  price: string | null;
  price_currency: string;
  show_price: boolean;
  excerpt: string;
  description?: string;
  concept?: string;
  artist_note?: string;
  /** Resolved cover image (served by the API as both `cover` and `hero`). */
  cover: MediaAsset | null;
  hero?: MediaAsset | null;
  /** Raw media id of the cover, used by the admin form. */
  hero_image: number | null;
  images?: ArtworkImage[];
  layout_span: "normal" | "wide" | "tall" | "large";
  allow_zoom: boolean;
  is_featured: boolean;
  status: string;
  view_count?: number;
  sculpture_detail?: SculptureDetail | null;
  related_artworks?: Artwork[];
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
  seo_title?: string;
  seo_description?: string;
  noindex?: boolean;
  og_image_url?: string;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
  order: number;
};

export type SculptureDetail = {
  material: string;
  height_cm: string | null;
  width_cm: string | null;
  depth_cm: string | null;
  weight_kg: string | null;
  edition: string;
  foundry: string;
  patina: string;
  location: string;
  outdoor_suitable: boolean;
  dimensions_display: string;
};

export type Collection = {
  id: number;
  slug: string;
  title: string;
  title_en: string;
  subtitle: string;
  description: string;
  statement?: string;
  year: string;
  cover: MediaAsset | null;
  is_featured: boolean;
  artwork_count: number;
  artworks?: Artwork[];
  status?: string;
  is_published?: boolean;
  seo_title?: string;
  seo_description?: string;
  order: number;
};

export type Exhibition = {
  id: number;
  slug: string;
  title: string;
  title_en: string;
  kind: string;
  kind_label: string;
  year_label: string;
  start_date: string | null;
  end_date: string | null;
  venue: string;
  city: string;
  country: string;
  location_display: string;
  description: string;
  curator: string;
  external_url: string;
  cover: MediaAsset | null;
  state: "upcoming" | "current" | "past";
  state_label: string;
  images?: Array<{ id: number; image: MediaAsset | null; caption: string }>;
  artworks?: Artwork[];
  order: number;
};

export type PageSection = {
  id: number;
  section_type: string;
  eyebrow: string;
  heading: string;
  subheading: string;
  body: string;
  image: MediaAsset | null;
  settings: Record<string, unknown>;
  is_enabled: boolean;
  background: "default" | "surface" | "surface2" | "accent";
  spacing: "compact" | "normal" | "spacious";
  order: number;
};

export type Page = {
  id: number;
  slug: string;
  title: string;
  title_en: string;
  kind: string;
  is_locked: boolean;
  sections: PageSection[];
  seo_title?: string;
  seo_description?: string;
};

export type Bootstrap = {
  site: SiteSetting;
  theme: ResolvedTheme;
  themes: ThemeSummary[];
  seasons: Season[];
  navigation: { header: NavItem[]; mobile: NavItem[]; footer: NavItem[] };
  social_links: SocialLink[];
  artist: Artist | null;
  home: Page | null;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
