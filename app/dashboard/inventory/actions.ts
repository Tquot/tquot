"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type InventoryCategory =
  | "hotels"
  | "experiences"
  | "suppliers"
  | "tour_operators";

export type InventoryItem = {
  id: string;
  user_id: string;
  category: InventoryCategory;
  name: string;
  data: Record<string, string>;
  created_at: string;
};

export async function getInventoryItems() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { items: [] as InventoryItem[], error: "Not authenticated." };
  }

  const { data, error } = await supabase
    .from("inventory")
    .select("id,user_id,category,name,data,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { items: [] as InventoryItem[], error: error.message };
  }

  return { items: (data ?? []) as InventoryItem[], error: "" };
}

export async function createInventoryItem(input: {
  category: InventoryCategory;
  name: string;
  data: Record<string, string>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { item: null, error: "Not authenticated." };
  }

  const { data, error } = await supabase
    .from("inventory")
    .insert({
      user_id: user.id,
      category: input.category,
      name: input.name,
      data: input.data,
    })
    .select("id,user_id,category,name,data,created_at")
    .single();

  if (error) {
    return { item: null, error: error.message };
  }

  return { item: data as InventoryItem, error: "" };
}

export async function deleteInventoryItem(id: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("inventory")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error: error?.message ?? "" };
}
