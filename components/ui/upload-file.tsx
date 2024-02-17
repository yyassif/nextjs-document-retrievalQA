import { extractDocumentContent } from "@/lib/pdf-content-extractor";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Icons } from "../icons";
import { IconButton } from "./button";
import { showToast } from "./ui-lib";
import styles from "./upload-file.module.scss";

export default function UploadFile() {
  const supabase = createClient();
  const [uploading, setUploading] = useState<boolean>(false);
  const router = useRouter();

  const uploadSocket = useCallback(async () => {
    const channel = supabase.channel(`upload`);
    channel
      .on("broadcast", { event: "upload:complete" }, () => {
        setUploading(false);
        router.refresh();
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

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(`public/${file.name}`, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setUploading(false);
        showToast("Document already exists");
        return;
      }

      showToast("Extracting document content...");

      const { response, error } = await extractDocumentContent(file).then(
        async (content) => {
          const response = await fetch("/api/embeddings", {
            method: "POST",
            body: JSON.stringify({
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
        setUploading(false);
        showToast("Error uploading document");
        return;
      }

      if (response?.status === 200) {
        await uploadSocket();
        router.refresh();
        setUploading(false);
        showToast("PDF uploaded successfully");
        return;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uploadSocket]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxFiles: 1,
    maxSize: 64 * 1024 * 1024, // 64MB
    accept: { "application/pdf": [".pdf"] },
  });

  return (
    <section
      className={styles.mainsection}
      style={{
        width: "100%",
        margin: "16px 0",
        opacity: isDragActive ? 0.8 : 1,
      }}
      {...getRootProps()}
    >
      <div className="container">
        <header>
          <h1 style={{ display: "flex" }}>
            <Icons.up
              size={32}
              fontSize={32}
              style={{
                width: "32px",
                height: "32px",
                margin: "0 10px 0",
                padding: 0,
              }}
            />
            <span>Upload your PDF file</span>
          </h1>
        </header>
        <div className="dropArea">
          <div className="contentHolder">
            <p id="dropText">Drag & Drop your files</p>
            <p>Or</p>
            <input {...getInputProps()} />
            <div
              style={{
                width: "100%",
              }}
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
                text={uploading ? "Uploading" : "Click here To Upload"}
                shadow
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

{
  /* <div
      
      >
        <IconButton
          className="upload-button"
          icon=
          text={shouldNarrow || uploading ? undefined : "Upload Document"}
          shadow
        />
        
      </div> */
}
