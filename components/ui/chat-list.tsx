"use client";

import { useMobileScreen } from "@/hooks/utils";
import { createClient } from "@/lib/supabase/client";
import { PDFDocument } from "@/types/supa.tables";
import { usePathname, useRouter } from "next/navigation";
import { Icons } from "../icons";
import { Avatar } from "./emoji";
import styles from "./home.module.scss";
import { showConfirm } from "./ui-lib";

export function ChatItem(props: {
  onClick?: () => void;
  onDelete?: () => void;
  title: string;
  time: string;
  id: string;
  index: number;
  narrow?: boolean;
  selected?: boolean;
}) {
  return (
    <div
      className={styles["chat-item"]}
      style={{
        opacity: props.selected ? 0.85 : 1,
      }}
      onClick={props.onClick}
      title={props.title}
    >
      {props.narrow ? (
        <div className={styles["chat-item-narrow"]}>
          <div className={styles["chat-item-avatar"] + " no-dark"}>
            <Avatar avatar="2699-fe0f" />
          </div>
        </div>
      ) : (
        <div className={styles["chat-item-title"]}>{props.title}</div>
      )}

      <div
        className={styles["chat-item-delete"]}
        onClickCapture={(e) => {
          props.onDelete?.();
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <Icons.delete />
      </div>
    </div>
  );
}

export function ChatList(props: {
  documents: PDFDocument[];
  narrow?: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const isMobileScreen = useMobileScreen();
  const pathname = usePathname();

  return (
    <div className={styles["chat-list"]}>
      {props.documents?.map((item, i) => (
        <ChatItem
          title={item.document_name}
          time={new Date(item.created_at).toLocaleString()}
          key={item.id}
          id={item.id}
          index={i}
          selected={pathname === `/chat/${item.id}`}
          onClick={() => {
            router.push(`/chat/${item.id}`);
          }}
          onDelete={async () => {
            if (
              (!props.narrow && !isMobileScreen) ||
              (await showConfirm("Delete this conversation?"))
            ) {
              await supabase.from("documents").delete().eq("id", item.id);
            }
          }}
          narrow={props.narrow}
        />
      ))}
    </div>
  );
}
