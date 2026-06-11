#!/usr/bin/env bash
# Kiểm thử hộp trắng module nhắn tin (customer <-> driver)
# Chạy: bash backend/scripts/test-messages.sh
set -euo pipefail

BASE="${API_BASE:-http://localhost:3000/api}"
CHAT_BASE="${CHAT_BASE:-http://localhost:3000/chat}"
PASS="${PASS:-password123}"

CUSTOMER_EMAIL="${CUSTOMER_EMAIL:-customer1@jptaxi.dev}"
CUSTOMER2_EMAIL="${CUSTOMER2_EMAIL:-customer2@jptaxi.dev}"
DRIVER_EMAIL="${DRIVER_EMAIL:-driver1@jptaxi.dev}"

CUSTOMER_TOKEN=""
CUSTOMER2_TOKEN=""
DRIVER_TOKEN=""
CONVERSATION_ID=""
FIRST_MESSAGE_ID=""

json_get() {
  local file="$1" expr="$2"
  node -e "
    try {
      const d = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8') || '{}');
      const v = (${expr});
      if (v === undefined || v === null) process.stdout.write('');
      else process.stdout.write(String(v));
    } catch { process.stdout.write(''); }
  " "$file" 2>/dev/null || true
}

http_json() {
  local method="$1" path="$2" body="$3"
  local token="${4:-}"
  local tmp
  tmp="$(mktemp)"
  local code
  if [[ -n "$token" ]]; then
    code=$(curl -s -o "$tmp" -w "%{http_code}" -X "$method" "${BASE}${path}" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -d "$body" || true)
  else
    code=$(curl -s -o "$tmp" -w "%{http_code}" -X "$method" "${BASE}${path}" \
      -H "Content-Type: application/json" \
      -d "$body" || true)
  fi
  echo "${code}|${tmp}"
}

run_case() {
  local id="$1" expect="$2" method="$3" path="$4" body="$5" token="$6" note="$7"
  local out code file ok msg
  out="$(http_json "$method" "$path" "$body" "$token")"
  code="${out%%|*}"
  file="${out#*|}"
  ok="FAIL"
  [[ "$code" == "$expect" ]] && ok="PASS"
  msg="$(json_get "$file" "typeof d.message === 'string' ? d.message : (Array.isArray(d.message) ? d.message.join(', ') : '')")"
  printf "| %-4s | %3s | %-4s | %-4s | %-45s | %s\n" "$id" "$code" "$expect" "$ok" "$note" "${msg:0:60}"
  rm -f "$file"
}

login_token() {
  local endpoint="$1" email="$2" role="${3:-}"
  local out code file token
  local body
  if [[ -n "$role" ]]; then
    body="{\"email\":\"${email}\",\"password\":\"${PASS}\",\"role\":\"${role}\"}"
  else
    body="{\"email\":\"${email}\",\"password\":\"${PASS}\"}"
  fi
  out="$(http_json "POST" "$endpoint" "$body")"
  code="${out%%|*}"
  file="${out#*|}"
  token="$(json_get "$file" "d.token")"
  rm -f "$file"
  if [[ "$code" != "201" || -z "$token" ]]; then
    echo ""
    echo "Dang nhap that bai (${endpoint} - ${email}), HTTP=${code}"
    exit 1
  fi
  printf "%s" "$token"
}

echo ""
echo "=== White-box test: Messages API/Gateway ==="
echo "API: ${BASE}"
echo "CHAT: ${CHAT_BASE}"

preflight_code="$(curl -s -o /tmp/jptaxi_msg_preflight.json -w "%{http_code}" "${BASE}/login" || true)"
if [[ "${preflight_code}" == "000" ]]; then
  echo "Khong ket noi duoc backend tai ${BASE}. Hay chay backend truoc (npm run start:dev trong thu muc backend)."
  exit 1
fi

CUSTOMER_TOKEN="$(login_token "/login" "${CUSTOMER_EMAIL}" "customer")"
CUSTOMER2_TOKEN="$(login_token "/login" "${CUSTOMER2_EMAIL}" "customer")"
DRIVER_TOKEN="$(login_token "/login" "${DRIVER_EMAIL}" "driver")"

printf "| %-4s | %3s | %-4s | %-4s | %-45s | %s\n" "ID" "HTTP" "Mong" "KQ" "Kich ban" "Message"
printf "|%s\n" "------|-----|------|------|-----------------------------------------------|--------"

# M01: customer tao/lay conversation hop le voi driver.
out="$(http_json "POST" "/messages/conversations" "{\"peerRole\":\"driver\",\"peerId\":1}" "$CUSTOMER_TOKEN")"
code="${out%%|*}"
file="${out#*|}"
if [[ "$code" == "201" ]]; then
  CONVERSATION_ID="$(json_get "$file" "d.conversationId")"
fi
ok="FAIL"; [[ "$code" == "201" && -n "$CONVERSATION_ID" ]] && ok="PASS"
printf "| %-4s | %3s | %-4s | %-4s | %-45s | %s\n" "M01" "$code" "201" "$ok" "customer tao/lay hoi thoai voi driver" "conversationId=${CONVERSATION_ID:-N/A}"
rm -f "$file"
if [[ -z "${CONVERSATION_ID}" ]]; then
  echo ""
  echo "Khong tao duoc conversation, dung test."
  exit 1
fi

# M02: customer gui sai peerRole -> branch BadRequestException.
run_case "M02" "400" "POST" "/messages/conversations" \
  "{\"peerRole\":\"customer\",\"peerId\":2}" "$CUSTOMER_TOKEN" \
  "customer khong duoc tao chat voi customer"

# M03: driver gui sai peerRole -> branch BadRequestException.
run_case "M03" "400" "POST" "/messages/conversations" \
  "{\"peerRole\":\"driver\",\"peerId\":2}" "$DRIVER_TOKEN" \
  "driver khong duoc tao chat voi driver"

# M04: customer tao chat voi driver khong ton tai -> NotFound.
run_case "M04" "404" "POST" "/messages/conversations" \
  "{\"peerRole\":\"driver\",\"peerId\":999999}" "$CUSTOMER_TOKEN" \
  "peer driver khong ton tai"

# M05: customer list messages (hien tai co the rong), markRead duoc goi.
run_case "M05" "200" "GET" "/messages/conversations/${CONVERSATION_ID}/messages?limit=20" \
  "{}" "$CUSTOMER_TOKEN" \
  "doc danh sach tin nhan conversation"

# M06: customer gui tin nhan hop le.
out="$(http_json "POST" "/messages/conversations/${CONVERSATION_ID}/messages" \
  "{\"body\":\"[WB] customer -> driver $(date +%s)\"}" "$CUSTOMER_TOKEN")"
code="${out%%|*}"
file="${out#*|}"
FIRST_MESSAGE_ID="$(json_get "$file" "d.data?.messageId")"
ok="FAIL"; [[ "$code" == "201" && -n "$FIRST_MESSAGE_ID" ]] && ok="PASS"
printf "| %-4s | %3s | %-4s | %-4s | %-45s | %s\n" "M06" "$code" "201" "$ok" "customer gui tin (sendMessage)" "messageId=${FIRST_MESSAGE_ID:-N/A}"
rm -f "$file"

# M07: validate body rong -> MinLength.
run_case "M07" "400" "POST" "/messages/conversations/${CONVERSATION_ID}/messages" \
  "{\"body\":\"\"}" "$CUSTOMER_TOKEN" \
  "reject tin nhan rong"

# M08: driver doc danh sach va mark da doc.
run_case "M08" "200" "GET" "/messages/conversations/${CONVERSATION_ID}/messages?limit=10" \
  "{}" "$DRIVER_TOKEN" \
  "driver doc tin nhan + mark read"

# M09: customer2 truy cap conversation cua customer1 -> Forbidden.
run_case "M09" "403" "GET" "/messages/conversations/${CONVERSATION_ID}" \
  "{}" "$CUSTOMER2_TOKEN" \
  "chan truy cap trai phep hoi thoai"

# M10: pagination beforeMessageId nhanh.
if [[ -n "${FIRST_MESSAGE_ID}" ]]; then
  run_case "M10" "200" "GET" "/messages/conversations/${CONVERSATION_ID}/messages?beforeMessageId=${FIRST_MESSAGE_ID}&limit=5" \
    "{}" "$CUSTOMER_TOKEN" \
    "phan trang tin nhan theo beforeMessageId"
else
  printf "| %-4s | %3s | %-4s | %-4s | %-45s | %s\n" "M10" "---" "200" "SKIP" "phan trang tin nhan theo beforeMessageId" "bo qua vi M06 khong tra messageId"
fi

echo ""
echo "--- Socket smoke test (newMessage) ---"
if command -v node >/dev/null 2>&1; then
  SOCKET_OUT="$(mktemp)"
  NODE_PATH="$(pwd)/backend/node_modules" \
  CHAT_BASE="${CHAT_BASE}" \
  DRIVER_TOKEN="${DRIVER_TOKEN}" \
  CONVERSATION_ID="${CONVERSATION_ID}" \
  node -e "
    const { io } = require('socket.io-client');
    const base = process.env.CHAT_BASE;
    const token = process.env.DRIVER_TOKEN;
    const cid = Number(process.env.CONVERSATION_ID);
    const socket = io(base, { auth: { token: 'Bearer ' + token }, transports: ['websocket'] });
    let finished = false;
    const done = (msg) => {
      if (finished) return;
      finished = true;
      console.log(msg);
      socket.close();
      process.exit(0);
    };
    const timer = setTimeout(() => done('SOCKET: WARN - khong nhan duoc newMessage trong 4s'), 4000);
    socket.on('connect', () => socket.emit('joinConversation', { conversationId: cid }));
    socket.on('newMessage', (payload) => {
      clearTimeout(timer);
      done('SOCKET: PASS - nhan newMessage cho conversation ' + (payload?.conversationId ?? 'N/A'));
    });
    socket.on('connect_error', () => {
      clearTimeout(timer);
      done('SOCKET: WARN - khong ket noi duoc /chat namespace');
    });
  " >"${SOCKET_OUT}" 2>&1 &
  SOCKET_PID=$!

  # Kich hoat event newMessage tu luong HTTP sau khi socket da join room.
  sleep 1
  trigger="$(http_json "POST" "/messages/conversations/${CONVERSATION_ID}/messages" \
    "{\"body\":\"[WB-SOCKET] ping $(date +%s)\"}" "$CUSTOMER_TOKEN")"
  trigger_file="${trigger#*|}"
  rm -f "$trigger_file"

  wait "$SOCKET_PID" || true
  cat "${SOCKET_OUT}"
  rm -f "${SOCKET_OUT}"
else
  echo "SOCKET: SKIP - khong co node"
fi

echo ""
echo "Hoan tat kiem thu hop trang. Neu co dong FAIL, can xem logic/du lieu test."
echo ""
