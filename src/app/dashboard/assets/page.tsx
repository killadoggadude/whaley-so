import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AssetLibrary } from "@/components/assets/asset-library";
import { getAssetsAction, getUserTagsAction, getModelsListAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Assets | AI OFM",
  description: "Upload and manage your media assets",
};

export default async function AssetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [assetsResult, userTags, modelsResult] = await Promise.all([
    getAssetsAction({ limit: 24, offset: 0 }),
    getUserTagsAction(),
    getModelsListAction(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6">Asset Library</h1>
        <p className="text-muted-foreground">
          Upload, organize, and manage your media files.
        </p>
      </div>

      <AssetLibrary
        initialAssets={assetsResult.assets}
        initialTotal={assetsResult.total}
        userTags={userTags}
        aiModels={modelsResult.models}
      />
    </div>
  );
}
