#!/usr/bin/env bash
#
# Cycle de vie du POC Stagehand : start / stop / restart / status / logs.
#
# `start` lance le scenario en arriere-plan dans sa propre session (setsid),
# ce qui permet a `stop` de tuer tout le groupe de processus, navigateur inclus.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="${ROOT_DIR}/.run"
PID_FILE="${RUN_DIR}/poc.pid"
LOG_FILE="${RUN_DIR}/poc.log"

log() { printf '%s\n' "$*" >&2; }

running_pid() {
  [[ -f "${PID_FILE}" ]] || return 1
  local pid
  pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
  [[ -n "${pid}" ]] || return 1
  kill -0 "${pid}" 2>/dev/null || return 1
  printf '%s' "${pid}"
}

require_env() {
  if [[ ! -f "${ROOT_DIR}/.env" && -z "${ANTHROPIC_API_KEY:-}" ]]; then
    log "Erreur : ni .env ni ANTHROPIC_API_KEY dans l'environnement."
    log "        cp .env.example .env puis renseignez votre cle Anthropic."
    exit 1
  fi
}

cmd_start() {
  if pid="$(running_pid)"; then
    log "Le POC tourne deja (pid ${pid}). Utilisez 'make restart' ou 'make stop'."
    exit 1
  fi

  require_env
  mkdir -p "${RUN_DIR}"
  : > "${LOG_FILE}"

  # setsid : nouveau groupe de processus => stop peut tuer Chromium avec.
  # stdbuf -oL : garde les logs applicatifs et Stagehand dans l'ordre reel.
  setsid stdbuf -oL env KEEP_OPEN=1 npm --prefix "${ROOT_DIR}" start \
    >>"${LOG_FILE}" 2>&1 < /dev/null &
  local pid=$!
  echo "${pid}" > "${PID_FILE}"

  log "POC demarre (pid ${pid})."
  log "Logs : ${LOG_FILE}  (make logs)"
}

cmd_stop() {
  if ! pid="$(running_pid)"; then
    log "Aucun POC en cours."
    rm -f "${PID_FILE}"
    return 0
  fi

  log "Arret du POC (pid ${pid}) et fermeture du navigateur..."

  # SIGTERM au groupe : le script ferme Stagehand proprement.
  kill -TERM "-${pid}" 2>/dev/null || kill -TERM "${pid}" 2>/dev/null || true

  for _ in $(seq 1 50); do
    kill -0 "${pid}" 2>/dev/null || break
    sleep 0.2
  done

  if kill -0 "${pid}" 2>/dev/null; then
    log "Arret propre expire, SIGKILL."
    kill -KILL "-${pid}" 2>/dev/null || kill -KILL "${pid}" 2>/dev/null || true
  fi

  rm -f "${PID_FILE}"
  log "POC arrete."
}

cmd_status() {
  if pid="$(running_pid)"; then
    log "POC en cours (pid ${pid})."
  else
    log "POC arrete."
    return 1
  fi
}

cmd_logs() {
  [[ -f "${LOG_FILE}" ]] || { log "Aucun log : ${LOG_FILE}"; exit 1; }
  tail -n "${LINES:-80}" -f "${LOG_FILE}"
}

case "${1:-}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  status)  cmd_status ;;
  logs)    cmd_logs ;;
  *)       log "Usage: $0 {start|stop|status|logs}"; exit 2 ;;
esac
