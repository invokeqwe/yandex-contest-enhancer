(function () {
  const MODE_NAME = "yc-ide-highlight";
  const APPLIED_FLAG = "__ycIdeHighlightApplied";
  const ORIGINAL_MODE = "__ycIdeHighlightOriginalMode";
  const KEYWORDS = new Set([
    "and", "as", "assert", "async", "await", "break", "case", "catch", "class",
    "const", "continue", "def", "default", "del", "do", "elif", "else", "enum",
    "except", "explicit", "export", "extends", "extern", "false", "finally",
    "for", "from", "global", "if", "import", "in", "inline", "interface", "is",
    "lambda", "namespace", "new", "noexcept", "nonlocal", "not", "nullptr",
    "or", "pass", "private", "protected", "public", "raise", "return", "static",
    "struct", "switch", "template", "throw", "true", "try", "typedef", "typename",
    "using", "while", "with", "yield"
  ]);
  const TYPES = new Set([
    "auto", "bool", "char", "double", "float", "int", "long", "short", "signed",
    "size_t", "str", "tuple", "unsigned", "void"
  ]);
  const BUILTINS = new Set([
    "abs", "all", "any", "append", "bool", "cin", "cout", "dict", "enumerate",
    "float", "input", "int", "len", "list", "map", "max", "min", "pow", "print",
    "range", "reversed", "set", "sorted", "str", "sum", "vector"
  ]);
  const ATOMS = new Set(["False", "None", "True", "false", "null", "nullptr", "true"]);

  function defineMode(CodeMirror) {
    if (!CodeMirror || CodeMirror.modes?.[MODE_NAME]) {
      return;
    }

    CodeMirror.defineMode(MODE_NAME, function () {
      return {
        startState() {
          return { blockComment: false };
        },

        token(stream, state) {
          if (state.blockComment) {
            if (stream.skipTo("*/")) {
              stream.match("*/");
              state.blockComment = false;
            } else {
              stream.skipToEnd();
            }
            return "comment";
          }

          if (stream.eatSpace()) {
            return null;
          }

          if (stream.match("//") || stream.match("#")) {
            stream.skipToEnd();
            return "comment";
          }

          if (stream.match("/*")) {
            state.blockComment = true;
            return "comment";
          }

          if (stream.match(/r?("""|''')/i)) {
            const quote = stream.current().replace(/^r/i, "");
            while (!stream.eol()) {
              if (stream.match(quote)) {
                break;
              }
              stream.next();
            }
            return "string";
          }

          if (stream.match(/["'`]/)) {
            const quote = stream.current();
            let escaped = false;
            while (!stream.eol()) {
              const next = stream.next();
              if (next === quote && !escaped) {
                break;
              }
              escaped = !escaped && next === "\\";
            }
            return "string";
          }

          if (stream.match(/0[xX][0-9a-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/)) {
            return "number";
          }

          if (stream.match(/[+\-*/%=!<>|&~^?:]+/)) {
            return "operator";
          }

          if (stream.match(/[A-Za-z_][A-Za-z0-9_]*/)) {
            const word = stream.current();
            if (KEYWORDS.has(word)) return "keyword";
            if (TYPES.has(word)) return "type";
            if (BUILTINS.has(word)) return "builtin";
            if (ATOMS.has(word)) return "atom";
            if (/^[A-Z][A-Za-z0-9_]*$/.test(word)) return "def";
            return "variable";
          }

          stream.next();
          return null;
        }
      };
    });
  }

  function isThemeEnabled() {
    return document.documentElement.dataset.ycDarkTheme === "on";
  }

  function getEditors() {
    return Array.from(document.querySelectorAll(".CodeMirror"))
      .map((element) => element.CodeMirror)
      .filter(Boolean);
  }

  function applyMode(CodeMirror) {
    defineMode(CodeMirror);

    for (const editor of getEditors()) {
      if (!editor[APPLIED_FLAG]) {
        editor[ORIGINAL_MODE] = editor.getOption("mode");
        editor[APPLIED_FLAG] = true;
      }

      if (editor.getOption("mode") !== MODE_NAME) {
        editor.setOption("mode", MODE_NAME);
      }
    }
  }

  function restoreMode() {
    for (const editor of getEditors()) {
      if (!editor[APPLIED_FLAG]) {
        continue;
      }

      editor.setOption("mode", editor[ORIGINAL_MODE] || null);
      editor[APPLIED_FLAG] = false;
    }
  }

  function syncHighlighting() {
    const CodeMirror = window.CodeMirror;

    if (!CodeMirror) {
      return;
    }

    if (isThemeEnabled()) {
      applyMode(CodeMirror);
    } else {
      restoreMode();
    }
  }

  const observer = new MutationObserver(syncHighlighting);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-yc-dark-theme"]
  });

  setInterval(syncHighlighting, 1000);
  syncHighlighting();
})();
