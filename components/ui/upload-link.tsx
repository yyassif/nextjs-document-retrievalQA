import Link from "next/link";
import { Icons } from "../icons";
import { IconButton } from "./button";

export default function UploadLink({
  shouldNarrow,
}: {
  shouldNarrow: boolean;
}) {
  return (
    <div
      style={{
        width: "100%",
        margin: "8px 0",
      }}
    >
      <Link href="/upload">
        <IconButton
          className="upload-button"
          icon={
            <Icons.add
              size={22}
              style={{ color: "white !important" }}
              fontSize={22}
            />
          }
          text={shouldNarrow ? undefined : "Upload Document"}
          shadow
        />
      </Link>
    </div>
  );
}
