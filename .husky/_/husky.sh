#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  debug () {
    if [ "$HUSKY_DEBUG" = "1" ]; then
      echo "husky (debug) - $1"
    fi
  }

  readonly hook_name="$1"
  readonly git_params="$2"
  readonly husky_skip_init=1
  export husky_skip_init

  debug "starting $hook_name..."

  if [ -f ~/.huskyrc ]; then
    debug "sourcing ~/.huskyrc"
    . ~/.huskyrc
  fi

  export readonly npm_lifecycle_event

  sh -e "$0" "$@"
  exitCode="$?"

  if [ $exitCode != 0 ]; then
    debug "hook $hook_name failed (code $exitCode)."
    exit $exitCode
  fi

  debug "done"
fi
