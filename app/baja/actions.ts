"use server";

import { redirect } from "next/navigation";

import { darDeBaja, firmaBajaValida } from "@/lib/lista";

export async function confirmarBaja(form: FormData) {
  const email = String(form.get("email") ?? "");
  const firma = String(form.get("t") ?? "");

  if (!firmaBajaValida(email, firma)) redirect("/baja?estado=invalido");

  await darDeBaja(email);
  redirect("/baja?estado=hecho");
}
