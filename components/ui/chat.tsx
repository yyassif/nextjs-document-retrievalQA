"use client";

import { autoGrowTextArea, useMobileScreen } from "@/hooks/utils";
import {
  Conversation,
  Message as ConversationMessage,
} from "@/types/supa.tables";
import { Message, useChat } from "ai/react";
import dynamic from "next/dynamic";
import { Fragment, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Icons } from "../icons";
import { IconButton } from "./button";
import styles from "./chat.module.scss";
import { Avatar } from "./emoji";
import { showToast } from "./ui-lib";

const Markdown = dynamic(async () => (await import("./markdown")).Markdown, {
  loading: () => <Icons.threeDots />,
});

function useScrollToBottom() {
  // for auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  function scrollDomToBottom() {
    const dom = scrollRef.current;
    if (dom) {
      requestAnimationFrame(() => {
        setAutoScroll(true);
        dom.scrollTo(0, dom.scrollHeight);
      });
    }
  }

  // auto scroll
  useEffect(() => {
    if (autoScroll) {
      scrollDomToBottom();
    }
  });

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollDomToBottom,
  };
}

export default function Chat({
  chatId,
  conversation,
  initialMessages,
}: {
  chatId: string;
  conversation: Conversation;
  initialMessages: ConversationMessage[];
}) {
  const [inputRows, setInputRows] = useState(2);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { scrollRef, setAutoScroll, scrollDomToBottom } = useScrollToBottom();
  const isMobileScreen = useMobileScreen();

  // auto grow input
  const measure = useDebouncedCallback(
    () => {
      const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : 1;
      const inputRows = Math.min(
        20,
        Math.max(2 + Number(!isMobileScreen), rows)
      );
      setInputRows(inputRows);
    },
    100,
    {
      leading: true,
      trailing: true,
    }
  );

  const {
    messages,
    input,
    handleSubmit,
    handleInputChange,
    isLoading,
    setMessages,
  } = useChat({
    api: "/api/retrieval",
    body: {
      conversation_id: chatId,
    },
    onError: (e) => {
      showToast("API Failed");
    },
  });

  // Fetch messages when the chat_id changes indicating a new PDF
  useEffect(() => {
    if (chatId) {
      setMessages(
        (initialMessages ?? []).map((message) => {
          return {
            id: message.id!,
            createdAt: new Date(message.created_at as string),
            content: message.body as string,
            role: message.role?.toLocaleLowerCase() as string,
          } as Message;
        }) || []
      );
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(measure, [input]);

  return (
    <div className={styles.chat} key={chatId}>
      <div className="window-header">
        <div className={`window-header-title ${styles["chat-body-title"]}`}>
          <div
            className={`window-header-main-title ${styles["chat-body-main-title"]}`}
          >
            {conversation.name}
          </div>
          <div className="window-header-sub-title">
            {messages.length} Messages
          </div>
        </div>
      </div>

      <div
        className={styles["chat-body"]}
        ref={scrollRef}
        onMouseDown={() => inputRef.current?.blur()}
        onTouchStart={() => {
          inputRef.current?.blur();
          setAutoScroll(false);
        }}
      >
        {messages.map((message, i) => {
          const isUser = message.role === "user";
          return (
            <Fragment key={message.id}>
              <div
                className={
                  isUser ? styles["chat-message-user"] : styles["chat-message"]
                }
              >
                <div className={styles["chat-message-container"]}>
                  <div className={styles["chat-message-header"]}>
                    <div className={styles["chat-message-avatar"]}>
                      {isUser ? (
                        <Avatar avatar={"1f603"} />
                      ) : (
                        <Avatar avatar="2699-fe0f" />
                      )}
                    </div>
                  </div>
                  <div className={styles["chat-message-item"]}>
                    <Markdown
                      content={message.content}
                      loading={
                        isLoading && message.content.length === 0 && !isUser
                      }
                      fontSize={14}
                      parentRef={scrollRef}
                      defaultShow={i >= messages.length - 6}
                    />
                  </div>

                  <div className={styles["chat-message-action-date"]}>
                    {message.createdAt.toLocaleString()}
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>

      <div className={styles["chat-input-panel"]}>
        <form
          className={styles["chat-input-panel-inner"]}
          onSubmit={handleSubmit}
        >
          <textarea
            ref={inputRef}
            className={styles["chat-input"]}
            placeholder={"Write a message..."}
            onChange={handleInputChange}
            value={input}
            onFocus={scrollDomToBottom}
            onClick={scrollDomToBottom}
            rows={inputRows}
            autoFocus={!isMobileScreen}
            disabled={isLoading}
            style={{
              fontSize: 14,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <IconButton
            disabled={isLoading}
            icon={<Icons.sendWhite />}
            text={"Send"}
            className={styles["chat-input-send"]}
            type="primary"
            onClick={() => {}}
            isSubmit
          />
        </form>
      </div>
    </div>
  );
}
