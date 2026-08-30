import { redirect } from "next/navigation";
export default function Page() {
  redirect("/documents?kind=purchase_order");
}
