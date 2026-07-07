import {
  Coffee, ShoppingBag, Dumbbell, Shirt, UtensilsCrossed, Rocket, MapPin,
} from "lucide-react";

export const CATEGORIES = [
  { id: "Cafe", label: "Cafe", Icon: Coffee },
  { id: "D2C", label: "D2C", Icon: ShoppingBag },
  { id: "Fitness", label: "Fitness", Icon: Dumbbell },
  { id: "Fashion", label: "Fashion", Icon: Shirt },
  { id: "Resto", label: "Resto", Icon: UtensilsCrossed },
  { id: "Startup", label: "Startup", Icon: Rocket },
  { id: "Local", label: "Local", Icon: MapPin },
] as const;

export const NICHES = [
  "Fashion", "Food", "Travel", "Tech", "Fitness",
  "Beauty", "Lifestyle", "Photography", "Art", "Other",
] as const;
