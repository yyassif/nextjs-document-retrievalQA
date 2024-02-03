import { useSession } from "@/components/providers/supabase";
import { extractDocumentContent } from "@/lib/pdf-content-extractor";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Icons } from "../icons";
import { IconButton } from "./button";
import { showToast } from "./ui-lib";

export default function UploadFile({
  shouldNarrow,
}: {
  shouldNarrow: boolean;
}) {
  const supabase = createClient();
  const session = useSession();
  const profile_id = session?.user.id as string;
  const [uploading, setUploading] = useState<boolean>(false);
  const router = useRouter();

  const uploadSocket = useCallback(async () => {
    const channel = supabase.channel(`upload:${profile_id}`);
    channel
      .on("broadcast", { event: "upload:complete" }, ({ payload }) => {
        setUploading(false);

        const { id } = payload;
        router.push(`/chat/${id}`);
      })
      .on("broadcast", { event: "upload:progress" }, ({ payload }) => {
        showToast(payload.message);
      })
      .on("broadcast", { event: "upload:error" }, ({ payload }) => {
        setUploading(false);
        showToast(payload.message);
      })
      .subscribe();
  }, []);

  const onDrop = useCallback(
    async <T extends File>(acceptedFiles: T[]) => {
      if (acceptedFiles.length === 0) {
        showToast("Please upload a pdf file");
        return;
      }

      setUploading(true);
      const file = acceptedFiles[0];

      const { data } = await supabase.storage
        .from("documents")
        .upload(`public/${file.name}`, file, {
          cacheControl: "3600",
          upsert: false,
        });

      console.log(data);

      showToast("Extracting document content...");

      const { response, error } = await extractDocumentContent(file).then(
        async (content) => {
          const response = await fetch("/api/embed-docs", {
            method: "POST",
            body: JSON.stringify({
              document_name: file.name,
              file_key: data.path,
              profile_id,
              content,
            }),
            cache: "no-store",
          });
          if (!response.ok) {
            return { error: "Error processing document" };
          }
          return { response };
        }
      );

      if (error) {
        showToast("Error uploading document");
        return;
      }

      if (response?.status === 200) {
        await uploadSocket();
        router.refresh();
        showToast("PDF Chat created!");
        return;
      }
      setUploading(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uploadSocket]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxFiles: 1,
    maxSize: 32 * 1024 * 1024, // 32MB
    accept: { "application/pdf": [".pdf"] },
  });

  return (
    <div
      style={{
        width: "100%",
        margin: "16px 0",
        opacity: isDragActive ? 0.8 : 1,
      }}
      {...getRootProps()}
    >
      <IconButton
        className="upload-button"
        icon={
          uploading ? (
            <Icons.threeDots
              size={22}
              style={{ color: "white !important" }}
              fontSize={22}
            />
          ) : (
            <Icons.add
              size={22}
              style={{ color: "white !important" }}
              fontSize={22}
            />
          )
        }
        text={shouldNarrow || uploading ? undefined : "Upload Document"}
        shadow
      />
      <input {...getInputProps()} />
    </div>
  );
}
