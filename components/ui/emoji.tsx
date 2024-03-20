import EmojiPicker, {
  Emoji,
  EmojiStyle,
  Theme as EmojiTheme,
} from "emoji-picker-react";
import { Icons } from "../icons";
import useTheme from "@/hooks/use-theme";

export function getEmojiUrl(unified: string, style: EmojiStyle) {
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/${style}/64/${unified}.png`;
}

export function AvatarPicker(props: {
  onEmojiClick: (emojiId: string) => void;
}) {
  return (
    <EmojiPicker
      lazyLoadEmojis
      theme={EmojiTheme.AUTO}
      getEmojiUrl={getEmojiUrl}
      onEmojiClick={(e) => {
        props.onEmojiClick(e.unified);
      }}
    />
  );
}

export function Avatar(props: { model?: boolean; user?: boolean; avatar?: string }) {
  const { theme } = useTheme()
  if (props.model) {
    return (
      <div>
        <Icons.assistant className="user-avatar" fill={theme === "dark" ? "#FFF" : "#000"} />
      </div>
    );
  }

  if (props.user) {
    return (
      <div>
        <Icons.doctor className="user-avatar" fill={theme === "dark" ? "#FFF" : "#000"} />
      </div>
    );
  }

  return (
    <div className="user-avatar">
      {props.avatar && <EmojiAvatar avatar={props.avatar} />}
    </div>
  );
}

export function EmojiAvatar(props: { avatar: string; size?: number }) {
  return (
    <Emoji
      unified={props.avatar}
      size={props.size ?? 18}
      getEmojiUrl={getEmojiUrl}
    />
  );
}
