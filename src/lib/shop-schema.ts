import { z } from "zod";

// One schema for the admin shop form: the browser validates with it before
// saving, and the server action validates again before calling save_shop.

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Enter a link that starts with https://");

const coordinate = (max: number, name: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= max), `Enter the ${name} as a number, like ${max === 90 ? "-8.6478" : "115.1385"}.`);

export const newRoasterSchema = z.object({
  name: z.string().trim().min(1, "Enter the roaster's name.").max(120),
  city: z.string().trim().max(80),
  processing: z.array(z.string()),
});

export const shopFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter the shop's name.").max(120, "Keep the name under 120 characters."),
    address: z.string().trim().min(1, "Enter the address.").max(300),
    area_id: z.string().min(1, "Choose an area."),
    maps_url: optionalUrl,
    lat: coordinate(90, "latitude"),
    lng: coordinate(180, "longitude"),
    type: z.enum(["roaster", "maker", "both"], { error: "Choose whether the shop roasts, makes coffee, or both." }),
    roaster_ids: z.array(z.string()),
    new_roasters: z.array(newRoasterSchema),
    roast_levels: z.array(z.string()).min(1, "Choose at least one roast level."),
    preparation_ids: z.array(z.string()).min(1, "Choose at least one preparation."),
    bean_origin: z.string().min(1, "Choose where the beans come from."),
    processing: z.array(z.string()).min(1, "Choose at least one processing method."),
    description: z.string().trim().max(600, "Keep the description under 600 characters, about three sentences."),
    website: optionalUrl,
    instagram: z.string().trim().max(60),
    is_hidden: z.boolean(),
  })
  .refine((v) => (v.lat === "") === (v.lng === ""), {
    path: ["lng"],
    message: "Enter both latitude and longitude, or leave both empty.",
  });

export type ShopFormValues = z.input<typeof shopFormSchema>;

export const emptyShopForm: ShopFormValues = {
  name: "",
  address: "",
  area_id: "",
  maps_url: "",
  lat: "",
  lng: "",
  type: "maker",
  roaster_ids: [],
  new_roasters: [],
  roast_levels: [],
  preparation_ids: [],
  bean_origin: "",
  processing: [],
  description: "",
  website: "",
  instagram: "",
  is_hidden: false,
};

/** "@sample.roastery" or an instagram.com link becomes "sample.roastery". */
export function instagramHandle(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
}
