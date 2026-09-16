// Flags the served index.html carries as data attributes on its body, for the shim and bridge to read.
const BODY_FLAGS = [
  ["demoMode", "data-demo-mode"],
  ["obsidianTermsAccepted", "data-obsidian-terms-accepted"],
];

// Adds a data attribute to the template's body tag for each set flag.
function stampBodyFlags(html, flags) {
  const attrs = BODY_FLAGS.filter(([key]) => flags[key]).map(
    ([, attr]) => ` ${attr}="true"`,
  );

  if (attrs.length === 0) {
    return html;
  }

  return html.replace(
    '<body class="theme-dark">',
    `<body class="theme-dark"${attrs.join("")}>`,
  );
}

module.exports = { stampBodyFlags };
