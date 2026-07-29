import { notFound } from "next/navigation";
import CharacterLab from "@/components/character-lab";

export default function CharacterLabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <CharacterLab />;
}
