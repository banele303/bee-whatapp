import {
  __name,
  init_esm
} from "./chunk-X3GXXDN7.mjs";

// node_modules/uncrypto/dist/crypto.node.mjs
init_esm();
import nodeCrypto from "node:crypto";
var subtle = nodeCrypto.webcrypto?.subtle || {};
var randomUUID = /* @__PURE__ */ __name(() => {
  return nodeCrypto.randomUUID();
}, "randomUUID");
var getRandomValues = /* @__PURE__ */ __name((array) => {
  return nodeCrypto.webcrypto.getRandomValues(array);
}, "getRandomValues");
var _crypto = {
  randomUUID,
  getRandomValues,
  subtle
};

export {
  subtle,
  randomUUID,
  getRandomValues,
  _crypto
};
//# sourceMappingURL=chunk-5JF2UKHY.mjs.map
