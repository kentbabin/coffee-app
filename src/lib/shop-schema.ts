import { z } from "zod";

// One schema for the admin shop form: the browser validates with it before
// saving, and the server action validates again before calling save_shop.

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Enter a link that starts with https://");

export const newRoasterSchema = z.object({
  name: z.string().trim().min(1, "Enter the roaster's name.").max(120),
  city: z.string().trim().max(80),
  processing: z.array(z.string()),
  /** The shop's own roastery (a shop of type both only). */
  own: z.boolean(),
});

export const shopFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter the shop's name.").max(120, "Keep the name under 120 characters."),
    // Empty on a new shop: generated from the name.
    slug: z
      .string()
      .trim()
      .max(120)
      .refine((v) => v === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), "Use lowercase letters, numbers and single hyphens, like sample-roastery."),
    address: z.string().trim().min(1, "Enter the address.").max(300),
    area_id: z.string().min(1, "Choose an area."),
    maps_url: optionalUrl,
    type: z.enum(["brewer", "both"], { error: "Choose whether the shop also roasts its own beans." }),
    // Optional: the existing roaster that roasts for this shop, when it is of type both.
    own_roaster_id: z.string(),
    // Other roasters whose beans the shop serves.
    roaster_ids: z.array(z.string()),
    new_roasters: z.array(newRoasterSchema),
    roast_levels: z.array(z.string()).min(1, "Choose at least one roast level."),
    preparation_ids: z.array(z.string()).min(1, "Choose at least one preparation."),
    bean_origin: z.string().min(1, "Choose where the beans come from."),
    processing: z.array(z.string()).min(1, "Choose at least one processing method."),
    serves_geisha: z.boolean(),
    description: z.string().trim().max(600, "Keep the description under 600 characters, about three sentences."),
    website: optionalUrl,
    instagram: z.string().trim().max(60),
    is_hidden: z.boolean(),
  });

export type ShopFormValues = z.input<typeof shopFormSchema>;

export const emptyShopForm: ShopFormValues = {
  name: "",
  slug: "",
  address: "",
  area_id: "",
  maps_url: "",
  type: "brewer",
  own_roaster_id: "",
  roaster_ids: [],
  new_roasters: [],
  roast_levels: [],
  preparation_ids: [],
  bean_origin: "",
  processing: [],
  serves_geisha: false,
  description: "",
  website: "",
  instagram: "",
  is_hidden: false,
};

/** A slug from a name, matching the database's slugify(): "Kopi Café!" becomes "kopi-cafe". */
export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "@sample.roastery" or an instagram.com link becomes "sample.roastery". */
export function instagramHandle(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
}

/** The admin roaster form. */
export const roasterFormSchema = z.object({
  name: z.string().trim().min(1, "Enter the roaster's name.").max(120, "Keep the name under 120 characters."),
  city: z.string().trim().max(80),
  processing: z.array(z.string()),
  website: optionalUrl,
});

export type RoasterFormValues = z.input<typeof roasterFormSchema>;
