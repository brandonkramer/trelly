import { homedir } from "node:os";
import { join } from "node:path";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TrelloClient } from "../../api/client.ts";
import { attachmentForm } from "../../util/attachment.ts";
import { openInBrowser } from "../../util/runtime.ts";
import {
  type CardChip,
  customFieldChips,
  toCustomFieldDefs,
  type UiCustomFieldDef,
  type UiCustomFieldItem,
} from "./custom-fields.ts";
import {
  dueHex,
  dueStatus,
  formatDue,
  labelHex,
  listAccentHex,
  TRELLO_BLUE,
} from "./palette.ts";

export type UiLabel = { id: string; name: string; color: string | null };

export type UiCard = {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  start?: string | null;
  dueComplete: boolean;
  idList: string;
  idMembers?: string[];
  pos: number;
  shortUrl: string;
  labels: UiLabel[];
  badges?: {
    checkItems?: number;
    checkItemsChecked?: number;
    comments?: number;
    attachments?: number;
  };
  customFieldItems?: UiCustomFieldItem[];
};

export type UiList = { id: string; name: string; color?: string | null };

type BoardData = {
  name: string;
  lists: UiList[];
  cardsByList: Map<string, UiCard[]>;
  customFields: UiCustomFieldDef[];
  membersById: Map<string, string>;
};

type CardExtras = {
  attachments: Array<{ id: string; name: string; url: string }>;
  checklists: Array<{
    id: string;
    name: string;
    items: Array<{ id: string; name: string; complete: boolean }>;
  }>;
  comments: Array<{
    id: string;
    author: string;
    username?: string;
    date: string;
    text: string;
  }>;
  error?: string;
};

const COL_WIDTH = 30;

function truncate(text: string, width: number): string {
  return text.length <= width ? text : `${text.slice(0, Math.max(0, width - 1))}…`;
}

function truncateLines(text: string, maxLines: number): string {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  return `${lines.slice(0, maxLines).join("\n")}\n…`;
}

function CardBadges({ card }: { card: UiCard }) {
  const status = dueStatus(card.due, card.dueComplete);
  const checkItems = card.badges?.checkItems ?? 0;
  const checked = card.badges?.checkItemsChecked ?? 0;
  const comments = card.badges?.comments ?? 0;
  const attachments = card.badges?.attachments ?? 0;
  return (
    <Text wrap="truncate">
      {card.labels.map((label) => (
        <Text key={label.id} color={labelHex(label.color)}>
          ●{" "}
        </Text>
      ))}
      {card.due ? (
        <Text color={dueHex(status)} dimColor={status === "later"}>
          {formatDue(card.due)}
          {status === "complete" ? " ✓" : ""}{" "}
        </Text>
      ) : null}
      {checkItems > 0 ? (
        <Text dimColor>
          ✓{checked}/{checkItems}{" "}
        </Text>
      ) : null}
      {card.desc ? <Text dimColor>≡ </Text> : null}
      {comments > 0 ? <Text dimColor>💬{comments} </Text> : null}
      {attachments > 0 ? <Text dimColor>📎{attachments}</Text> : null}
    </Text>
  );
}

function ChipRow({ chips }: { chips: CardChip[] }) {
  return (
    <Text wrap="truncate">
      {chips.map((chip) => (
        <Text key={chip.id}>
          <Text
            backgroundColor={chip.color ? labelHex(chip.color) : undefined}
            color={chip.color ? "#1d2125" : undefined}
            dimColor={!chip.color}
          >
            {` ${chip.label} `}
          </Text>{" "}
        </Text>
      ))}
    </Text>
  );
}

function CardBox({
  card,
  focused,
  width,
  accent,
  height,
  frontFields,
}: {
  card: UiCard;
  focused: boolean;
  width: number;
  accent: string;
  height: number;
  frontFields: UiCustomFieldDef[];
}) {
  const complete = card.dueComplete === true;
  const chips =
    frontFields.length > 0 ? customFieldChips(frontFields, card.customFieldItems) : [];
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={focused ? accent : "gray"}
      width={width}
      height={height}
      paddingX={1}
    >
      <Text bold={focused} wrap="truncate">
        {complete ? <Text color="#61bd4f">✓ </Text> : null}
        {truncate(card.name, width - 4 - (complete ? 2 : 0))}
      </Text>
      <CardBadges card={card} />
      {height >= 5 ? <ChipRow chips={chips} /> : null}
    </Box>
  );
}

function Column({
  list,
  cards,
  focused,
  focusedRow,
  width,
  maxCards,
  cardHeight,
  frontFields,
}: {
  list: UiList;
  cards: UiCard[];
  focused: boolean;
  focusedRow: number | null;
  width: number;
  maxCards: number;
  cardHeight: number;
  frontFields: UiCustomFieldDef[];
}) {
  const total = cards.length;
  const accent = listAccentHex(list.color);
  let start = 0;
  if (focusedRow !== null && focusedRow >= maxCards) {
    start = focusedRow - maxCards + 1;
  }
  const visible = cards.slice(start, start + maxCards);
  const below = total - (start + visible.length);
  return (
    <Box flexDirection="column" width={width} marginRight={1}>
      {focused ? (
        <Text backgroundColor={accent} color="#1d2125" bold wrap="truncate">
          {` ${truncate(list.name, width - 8)} (${total}) `}
        </Text>
      ) : (
        <Text bold color={accent} wrap="truncate">
          {truncate(list.name, width - 6)} <Text dimColor>({total})</Text>
        </Text>
      )}
      {start > 0 ? <Text dimColor> ↑ {start} more</Text> : null}
      {visible.map((card, i) => (
        <CardBox
          key={card.id}
          card={card}
          width={width - 1}
          focused={focusedRow === start + i}
          accent={accent}
          height={cardHeight}
          frontFields={frontFields}
        />
      ))}
      {total === 0 ? <Text dimColor> (empty)</Text> : null}
      {below > 0 ? <Text dimColor> ↓ {below} more</Text> : null}
    </Box>
  );
}

type DetailMode = "view" | "comment" | "reply" | "attach";

function CardDetail({
  card,
  listName,
  width,
  defs,
  membersById,
  extras,
  client,
  onClose,
  onChanged,
}: {
  card: UiCard;
  listName: string;
  width: number;
  defs: UiCustomFieldDef[];
  membersById: Map<string, string>;
  extras?: CardExtras;
  client: TrelloClient;
  onClose: () => void;
  onChanged: () => void;
}) {
  const status = dueStatus(card.due, card.dueComplete);
  const checkItems = card.badges?.checkItems ?? 0;
  const checked = card.badges?.checkItemsChecked ?? 0;
  const complete = card.dueComplete === true;
  const chips = customFieldChips(defs, card.customFieldItems);
  const memberNames = (card.idMembers ?? [])
    .map((id) => membersById.get(id))
    .filter((name): name is string => Boolean(name));

  const [focus, setFocus] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<DetailMode>("view");
  const [buffer, setBuffer] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  // refs mirror state so several key events in one tick see current values
  const bufferRef = useRef("");
  const busyRef = useRef(false);
  const setComposerBuffer = useCallback((value: string) => {
    bufferRef.current = value;
    setBuffer(value);
  }, []);

  const attachments = extras?.attachments ?? [];
  const comments = extras?.comments ?? [];
  const itemCount = attachments.length + comments.length;
  const safeFocus = itemCount === 0 ? -1 : Math.min(focus, itemCount - 1);
  const focusedAttachment =
    safeFocus >= 0 && safeFocus < attachments.length
      ? attachments[safeFocus]
      : undefined;
  const focusedComment =
    safeFocus >= attachments.length
      ? comments[safeFocus - attachments.length]
      : undefined;

  const submit = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setNotice(null);
      try {
        if (mode === "attach") {
          if (/^https?:\/\//i.test(text)) {
            await client.cardAddAttachment(card.id, { url: text });
          } else {
            const path = text.startsWith("~/") ? join(homedir(), text.slice(2)) : text;
            await client.cardUploadAttachment(card.id, attachmentForm(path));
          }
          setNotice({ text: "✓ attachment added" });
        } else {
          await client.cardComment(card.id, text);
          setNotice({ text: "✓ comment added" });
        }
        setMode("view");
        setComposerBuffer("");
        onChanged();
      } catch (err) {
        setNotice({
          text: err instanceof Error ? err.message : String(err),
          error: true,
        });
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [mode, client, card.id, onChanged, setComposerBuffer],
  );

  useInput((input, key) => {
    if (busyRef.current) return;
    if (mode !== "view") {
      if (key.escape) {
        setMode("view");
        setComposerBuffer("");
        return;
      }
      if (key.backspace || key.delete) {
        setComposerBuffer(bufferRef.current.slice(0, -1));
        return;
      }
      // paste can deliver text and the newline in one event; append before submit
      const typed = input && !key.ctrl && !key.meta ? input.replace(/[\r\n]/g, "") : "";
      if (typed) setComposerBuffer(bufferRef.current + typed);
      if (key.return) void submit(bufferRef.current);
      return;
    }
    if (key.escape || input === "q") {
      onClose();
    } else if (key.upArrow || input === "k") {
      if (safeFocus > 0) setFocus(safeFocus - 1);
    } else if (key.downArrow || input === "j") {
      if (safeFocus >= 0 && safeFocus < itemCount - 1) setFocus(safeFocus + 1);
    } else if (key.return && focusedAttachment) {
      openInBrowser(focusedAttachment.url).then(
        () => setNotice({ text: `✓ opened ${focusedAttachment.name}` }),
        (err) =>
          setNotice({
            text: err instanceof Error ? err.message : String(err),
            error: true,
          }),
      );
    } else if (key.return && focusedComment) {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(focusedComment.id)) next.delete(focusedComment.id);
        else next.add(focusedComment.id);
        return next;
      });
    } else if (input === "c") {
      setMode("comment");
      setComposerBuffer("");
      setNotice(null);
    } else if (input === "r" && focusedComment) {
      setMode("reply");
      setComposerBuffer(focusedComment.username ? `@${focusedComment.username} ` : "");
      setNotice(null);
    } else if (input === "a") {
      setMode("attach");
      setComposerBuffer("");
      setNotice(null);
    }
  });

  const commentFocus = safeFocus - attachments.length;
  const maxComments = 5;
  const commentStart = commentFocus >= maxComments ? commentFocus - maxComments + 1 : 0;
  const visibleComments = comments.slice(commentStart, commentStart + maxComments);
  const commentsBelow = comments.length - (commentStart + visibleComments.length);

  return (
    <Box flexDirection="column" paddingX={1} width={Math.min(width, 82)}>
      <Text bold wrap="truncate">
        {complete ? <Text color="#61bd4f">✓ </Text> : null}
        {card.name}
      </Text>
      <Text dimColor wrap="truncate">
        in {listName} · {card.shortUrl}
      </Text>
      {memberNames.length > 0 ? (
        <Text wrap="truncate">
          <Text dimColor>members: </Text>
          <Text color={TRELLO_BLUE}>
            {memberNames.map((name) => `@${name}`).join(" ")}
          </Text>
        </Text>
      ) : null}
      {card.labels.length > 0 ? (
        <Box marginTop={1} gap={1}>
          {card.labels.map((label) => (
            <Text
              key={label.id}
              backgroundColor={labelHex(label.color)}
              color="#1d2125"
            >
              {` ${label.name || label.color || "label"} `}
            </Text>
          ))}
        </Box>
      ) : null}
      {card.due || card.start ? (
        <Box marginTop={1}>
          {card.start ? <Text dimColor>start {formatDue(card.start)} </Text> : null}
          {card.due ? (
            <Text color={dueHex(status)}>
              due {formatDue(card.due)}
              {status === "complete" ? " ✓" : status === "overdue" ? " (overdue)" : ""}
            </Text>
          ) : null}
        </Box>
      ) : null}
      {chips.length > 0 ? (
        <Box marginTop={1}>
          <ChipRow chips={chips} />
        </Box>
      ) : null}
      {card.desc ? (
        <Box marginTop={1}>
          <Text>{truncateLines(card.desc, 10)}</Text>
        </Box>
      ) : null}
      {!extras ? (
        <Box marginTop={1}>
          <Text dimColor>
            loading details…
            {checkItems > 0 ? ` (checklist ${checked}/${checkItems})` : ""}
          </Text>
        </Box>
      ) : (
        <>
          {extras.error ? <Text color="#eb5a46">{extras.error}</Text> : null}
          {extras.checklists.map((checklist) => (
            <Box key={checklist.id} flexDirection="column" marginTop={1}>
              <Text bold>{checklist.name}</Text>
              {checklist.items.slice(0, 6).map((item) => (
                <Text key={item.id} wrap="truncate">
                  {item.complete ? <Text color="#61bd4f">☑ </Text> : "☐ "}
                  <Text dimColor={item.complete} strikethrough={item.complete}>
                    {item.name}
                  </Text>
                </Text>
              ))}
              {checklist.items.length > 6 ? (
                <Text dimColor>… {checklist.items.length - 6} more</Text>
              ) : null}
            </Box>
          ))}
          {attachments.length > 0 ? (
            <Box flexDirection="column" marginTop={1}>
              <Text bold>📎 {attachments.length} attachments</Text>
              {attachments.map((attachment, i) => (
                <Text key={attachment.id} wrap="truncate">
                  {safeFocus === i ? <Text color={TRELLO_BLUE}>❯ </Text> : "  "}
                  <Text bold={safeFocus === i} dimColor={safeFocus !== i}>
                    {attachment.name}
                  </Text>
                </Text>
              ))}
            </Box>
          ) : null}
          {comments.length > 0 ? (
            <Box flexDirection="column" marginTop={1}>
              <Text bold>💬 comments</Text>
              {commentStart > 0 ? <Text dimColor> ↑ {commentStart} more</Text> : null}
              {visibleComments.map((comment, i) => {
                const focused = commentFocus === commentStart + i;
                const isExpanded = expanded.has(comment.id);
                return (
                  <Box key={comment.id} flexDirection="column">
                    <Text wrap="truncate">
                      {focused ? <Text color={TRELLO_BLUE}>❯ </Text> : "  "}
                      <Text dimColor bold={focused}>
                        {comment.author} · {comment.date.slice(0, 16).replace("T", " ")}
                      </Text>
                    </Text>
                    <Box paddingLeft={2}>
                      <Text wrap={isExpanded ? "wrap" : "truncate-end"}>
                        {isExpanded ? comment.text : truncateLines(comment.text, 2)}
                      </Text>
                    </Box>
                  </Box>
                );
              })}
              {commentsBelow > 0 ? <Text dimColor> ↓ {commentsBelow} more</Text> : null}
            </Box>
          ) : null}
        </>
      )}
      {mode !== "view" ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>
            {mode === "attach"
              ? "attach (file path or URL)"
              : mode === "reply"
                ? "reply"
                : "comment"}
          </Text>
          <Text>
            {"> "}
            {buffer}
            <Text inverse> </Text>
          </Text>
        </Box>
      ) : null}
      {busy ? (
        <Text dimColor>sending…</Text>
      ) : notice ? (
        <Text color={notice.error ? "#eb5a46" : undefined} dimColor={!notice.error}>
          {notice.text}
        </Text>
      ) : null}
      <Box marginTop={1}>
        <Text dimColor>
          {mode !== "view"
            ? "⏎ send · esc cancel"
            : "↑↓ move · ⏎ open/expand · c comment · r reply · a attach · esc back"}
        </Text>
      </Box>
    </Box>
  );
}

function BoardView({
  client,
  boardId,
  profileName,
  onBack,
}: {
  client: TrelloClient;
  boardId: string;
  profileName: string;
  onBack?: () => void;
}) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [col, setCol] = useState(0);
  const [row, setRow] = useState(0);
  const [detail, setDetail] = useState(false);
  const [extras, setExtras] = useState<Map<string, CardExtras>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [board, lists, cards, customFieldsRaw, members] = await Promise.all([
        client.boardGet(boardId, { fields: "name" }) as Promise<{ name: string }>,
        client.boardLists(boardId, {
          filter: "open",
          fields: "name,pos,color",
        }) as Promise<UiList[]>,
        client.boardCards(boardId, {
          fields:
            "name,desc,due,start,dueComplete,idList,pos,shortUrl,labels,badges,idMembers",
          customFieldItems: true,
        }) as Promise<UiCard[]>,
        client.boardCustomFields(boardId),
        client.boardMembers(boardId) as Promise<
          Array<{ id: string; fullName?: string; username?: string }>
        >,
      ]);
      const cardsByList = new Map<string, UiCard[]>();
      for (const list of lists) cardsByList.set(list.id, []);
      for (const card of [...cards].sort((a, b) => a.pos - b.pos)) {
        cardsByList.get(card.idList)?.push(card);
      }
      setExtras(new Map());
      setData({
        name: board.name,
        lists,
        cardsByList,
        customFields: toCustomFieldDefs(customFieldsRaw),
        membersById: new Map(
          members.map((m) => [m.id, m.fullName || m.username || "member"]),
        ),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [client, boardId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadExtras = useCallback(
    async (card: UiCard, force = false) => {
      if (!force && extras.has(card.id)) return;
      try {
        const [attachments, checklists, actions] = await Promise.all([
          client.cardAttachments(card.id) as Promise<
            Array<{ id: string; name: string; url: string }>
          >,
          client.get(`/cards/${card.id}/checklists`) as Promise<
            Array<{
              id: string;
              name: string;
              checkItems?: Array<{ id: string; name: string; state?: string }>;
            }>
          >,
          client.cardActions(card.id, { filter: "commentCard", limit: 20 }) as Promise<
            Array<{
              id: string;
              date: string;
              memberCreator?: { fullName?: string; username?: string };
              data?: { text?: string };
            }>
          >,
        ]);
        setExtras((prev) =>
          new Map(prev).set(card.id, {
            attachments: attachments.map((a) => ({
              id: a.id,
              name: a.name,
              url: a.url,
            })),
            checklists: checklists.map((cl) => ({
              id: cl.id,
              name: cl.name,
              items: (cl.checkItems ?? []).map((item) => ({
                id: item.id,
                name: item.name,
                complete: item.state === "complete",
              })),
            })),
            comments: actions.map((action) => ({
              id: action.id,
              author:
                action.memberCreator?.fullName ??
                action.memberCreator?.username ??
                "unknown",
              username: action.memberCreator?.username,
              date: action.date,
              text: action.data?.text ?? "",
            })),
          }),
        );
      } catch (err) {
        setExtras((prev) =>
          new Map(prev).set(card.id, {
            attachments: [],
            checklists: [],
            comments: [],
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    },
    [client, extras],
  );

  useInput(
    (input, key) => {
      if (input === "q") {
        exit();
        return;
      }
      if (input === "r") {
        void load();
        return;
      }
      if ((key.escape || key.backspace) && onBack) {
        onBack();
        return;
      }
      if (!data || data.lists.length === 0) return;
      const lists = data.lists;
      const safeCol = Math.min(col, lists.length - 1);
      const cards = data.cardsByList.get(lists[safeCol].id) ?? [];
      const safeRow = cards.length === 0 ? -1 : Math.min(row, cards.length - 1);
      if (key.leftArrow || input === "h") {
        setCol(Math.max(0, safeCol - 1));
        setRow(0);
      } else if (key.rightArrow || input === "l") {
        setCol(Math.min(lists.length - 1, safeCol + 1));
        setRow(0);
      } else if (key.upArrow || input === "k") {
        if (safeRow > 0) setRow(safeRow - 1);
      } else if (key.downArrow || input === "j") {
        if (safeRow >= 0 && safeRow < cards.length - 1) setRow(safeRow + 1);
      } else if (key.return && safeRow >= 0) {
        const focusedCard = cards[safeRow];
        if (focusedCard) void loadExtras(focusedCard);
        setDetail(true);
      }
    },
    { isActive: !detail },
  );

  const columns = stdout?.columns ?? 80;
  const rows = stdout?.rows ?? 24;

  if (loading && !data) {
    return <Text> Loading board {boardId}…</Text>;
  }
  if (error && !data) {
    return (
      <Box flexDirection="column">
        <Text color="#eb5a46"> {error}</Text>
        <Text dimColor> r retry · q quit</Text>
      </Box>
    );
  }
  if (!data) return null;

  const lists = data.lists;
  const safeCol = lists.length > 0 ? Math.min(col, lists.length - 1) : 0;
  const focusedCards =
    lists.length > 0 ? (data.cardsByList.get(lists[safeCol].id) ?? []) : [];
  const safeRow = focusedCards.length > 0 ? Math.min(row, focusedCards.length - 1) : -1;
  const focusedCard = safeRow >= 0 ? focusedCards[safeRow] : undefined;

  const visibleCols = Math.max(1, Math.floor((columns - 2) / (COL_WIDTH + 1)));
  const colStart = Math.min(
    Math.max(0, safeCol - visibleCols + 1),
    Math.max(0, lists.length - visibleCols),
  );
  const shown = lists.slice(colStart, colStart + visibleCols);
  const frontFields = data.customFields.filter((def) => def.cardFront);
  const cardHeight = frontFields.length > 0 ? 5 : 4;
  const maxCards = Math.max(1, Math.floor((rows - 7) / cardHeight));

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text backgroundColor="#0079bf" color="#ffffff" bold>
          {` ${data.name} `}
        </Text>
        <Text dimColor>
          {"  "}
          {profileName} · {lists.length} lists
          {loading ? " · refreshing…" : ""}
          {error ? ` · ${error}` : ""}
        </Text>
      </Box>
      {detail && focusedCard ? (
        <CardDetail
          card={focusedCard}
          listName={lists[safeCol].name}
          width={columns}
          defs={data.customFields}
          membersById={data.membersById}
          extras={extras.get(focusedCard.id)}
          client={client}
          onClose={() => setDetail(false)}
          onChanged={() => void loadExtras(focusedCard, true)}
        />
      ) : (
        <Box>
          {colStart > 0 ? <Text dimColor>‹ </Text> : null}
          {shown.map((list, i) => (
            <Column
              key={list.id}
              list={list}
              cards={data.cardsByList.get(list.id) ?? []}
              focused={colStart + i === safeCol}
              focusedRow={colStart + i === safeCol ? safeRow : null}
              width={COL_WIDTH}
              maxCards={maxCards}
              cardHeight={cardHeight}
              frontFields={frontFields}
            />
          ))}
          {colStart + visibleCols < lists.length ? <Text dimColor>›</Text> : null}
        </Box>
      )}
      {detail ? null : (
        <Box marginTop={1}>
          <Text dimColor>
            {`←→ lists · ↑↓ cards · ⏎ detail · r refresh${onBack ? " · esc boards" : ""} · q quit`}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export type UiBoard = {
  id: string;
  name: string;
  shortUrl?: string;
  closed?: boolean;
  prefs?: {
    backgroundColor?: string | null;
    backgroundTopColor?: string | null;
  };
};

function boardDotHex(board: UiBoard): string {
  return board.prefs?.backgroundColor ?? board.prefs?.backgroundTopColor ?? TRELLO_BLUE;
}

function BoardPicker({
  client,
  profileName,
  onSelect,
}: {
  client: TrelloClient;
  profileName: string;
  onSelect: (board: UiBoard) => void;
}) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [boards, setBoards] = useState<UiBoard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = (await client.memberBoards("me", {
        filter: "open",
        fields: "name,shortUrl,closed,prefs",
      })) as UiBoard[];
      setBoards(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  useInput((input, key) => {
    if (input === "q") {
      exit();
      return;
    }
    if (input === "r") {
      void load();
      return;
    }
    if (!boards || boards.length === 0) return;
    const safeIdx = Math.min(idx, boards.length - 1);
    if (key.upArrow || input === "k") {
      setIdx(Math.max(0, safeIdx - 1));
    } else if (key.downArrow || input === "j") {
      setIdx(Math.min(boards.length - 1, safeIdx + 1));
    } else if (key.return) {
      onSelect(boards[safeIdx]);
    }
  });

  const rows = stdout?.rows ?? 24;

  if (loading && !boards) return <Text> Loading boards…</Text>;
  if (error && !boards) {
    return (
      <Box flexDirection="column">
        <Text color="#eb5a46"> {error}</Text>
        <Text dimColor> r retry · q quit</Text>
      </Box>
    );
  }
  if (!boards) return null;

  const safeIdx = boards.length > 0 ? Math.min(idx, boards.length - 1) : 0;
  const maxRows = Math.max(1, rows - 6);
  const start = safeIdx >= maxRows ? safeIdx - maxRows + 1 : 0;
  const visible = boards.slice(start, start + maxRows);
  const below = boards.length - (start + visible.length);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text backgroundColor="#0079bf" color="#ffffff" bold>
          {" Boards "}
        </Text>
        <Text dimColor>
          {"  "}
          {profileName} · {boards.length} open
          {loading ? " · refreshing…" : ""}
          {error ? ` · ${error}` : ""}
        </Text>
      </Box>
      {boards.length === 0 ? <Text dimColor> (no open boards)</Text> : null}
      {start > 0 ? <Text dimColor> ↑ {start} more</Text> : null}
      {visible.map((board, i) => {
        const focused = start + i === safeIdx;
        return (
          <Text key={board.id} wrap="truncate">
            {focused ? <Text color={TRELLO_BLUE}>❯ </Text> : "  "}
            <Text color={boardDotHex(board)}>● </Text>
            <Text bold={focused}>{board.name}</Text>
            {board.shortUrl ? <Text dimColor> {board.shortUrl}</Text> : null}
          </Text>
        );
      })}
      {below > 0 ? <Text dimColor> ↓ {below} more</Text> : null}
      <Box marginTop={1}>
        <Text dimColor>↑↓ move · ⏎ open · r refresh · q quit</Text>
      </Box>
    </Box>
  );
}

export function App({
  client,
  boardId,
  profileName,
}: {
  client: TrelloClient;
  boardId?: string;
  profileName: string;
}) {
  const [picked, setPicked] = useState<UiBoard | null>(null);
  if (boardId) {
    return <BoardView client={client} boardId={boardId} profileName={profileName} />;
  }
  if (!picked) {
    return (
      <BoardPicker client={client} profileName={profileName} onSelect={setPicked} />
    );
  }
  return (
    <BoardView
      key={picked.id}
      client={client}
      boardId={picked.id}
      profileName={profileName}
      onBack={() => setPicked(null)}
    />
  );
}
