"use server";

import { revalidatePath } from "next/cache";

import { claveCorrecta, cerrarSesion, iniciarSesion } from "@/lib/auth";

export async function entrarPuerta(_estado: unknown, form: FormData) {
  const pin = String(form.get("pin") ?? "");

  if (!claveCorrecta("puerta", pin)) {
    await new Promise((r) => setTimeout(r, 600));
    return { error: "PIN incorrecto." };
  }

  await iniciarSesion("puerta");
  revalidatePath("/validar");
  return { error: null };
}

export async function salirPuerta() {
  await cerrarSesion("puerta");
  revalidatePath("/validar");
}
