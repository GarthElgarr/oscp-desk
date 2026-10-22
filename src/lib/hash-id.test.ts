import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { identifyPaste } from "./hash-id.ts";

const NT = "8846f7eaee8fb117ad06bdd830b7586c";
const LM = "aad3b435b51404eeaad3b435b51404ee";

describe("identifyPaste", () => {
  it("turns a secretsdump line into bare NT for hashcat and $NT$ for john", () => {
    const [row] = identifyPaste(`CORP\\Administrator:500:${LM}:${NT}:::`);
    assert.equal(row.hashcatMode, "1000");
    assert.equal(row.hashcatLine, NT);
    assert.equal(row.johnFormat, "NT");
    assert.equal(row.johnLine, `Administrator:$NT$${NT}`);
    assert.match(row.note, /LM half is empty/);
  });

  it("pairs a mimikatz username with the NTLM line", () => {
    const [row] = identifyPaste("User Name : anita\nNTLM : 31d6cfe0d16ae931b73c59d7e0c089c0\n");
    assert.equal(row.hashcatLine, "31d6cfe0d16ae931b73c59d7e0c089c0");
    assert.equal(row.johnLine, "anita:$NT$31d6cfe0d16ae931b73c59d7e0c089c0");
    assert.match(row.note, /blank password/);
  });

  it("keeps a NetNTLMv2 line whole", () => {
    const hash = "anita::CORP:1122334455667788:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:0101000000000000";
    const [row] = identifyPaste(`[SMB] NTLMv2-SSP Hash : ${hash}`);
    assert.equal(row.hashcatMode, "5600");
    assert.equal(row.hashcatLine, hash);
    assert.equal(row.johnLine, hash);
  });

  it("strips a username in front of a TGS hash", () => {
    const body = "$krb5tgs$23$*svc$CORP.LOCAL$HTTP/app*$abcd$ef01";
    const [row] = identifyPaste(`svc:${body}`);
    assert.equal(row.hashcatMode, "13100");
    assert.equal(row.hashcatLine, body);
    assert.equal(row.johnFormat, "krb5tgs");
  });

  it("maps AES TGS etypes", () => {
    assert.equal(identifyPaste("$krb5tgs$17$*a$B$c*$aa$bb")[0].hashcatMode, "19600");
    assert.equal(identifyPaste("$krb5tgs$18$*a$B$c*$aa$bb")[0].hashcatMode, "19700");
  });

  it("keeps an AS-REP hash whole", () => {
    const body = "$krb5asrep$23$anita@CORP.LOCAL:aabbcc$ddeeff";
    const [row] = identifyPaste(body);
    assert.equal(row.hashcatMode, "18200");
    assert.equal(row.hashcatLine, body);
  });

  it("splits a shadow line", () => {
    const body = "$6$salt$hashedvalue";
    const [row] = identifyPaste(`root:${body}:19000:0:99999:7:::`);
    assert.equal(row.hashcatMode, "1800");
    assert.equal(row.hashcatLine, body);
    assert.equal(row.johnLine, `root:${body}`);
    assert.equal(row.johnFormat, "sha512crypt");
  });

  it("sends yescrypt to john only", () => {
    const [row] = identifyPaste("anita:$y$j9T$salt$hash");
    assert.equal(row.hashcatMode, null);
    assert.equal(row.hashcatLine, null);
    assert.equal(row.johnFormat, "yescrypt");
    assert.equal(row.johnLine, "anita:$y$j9T$salt$hash");
  });

  it("formats mysql differently for each tool", () => {
    const [row] = identifyPaste("*FCF7C1B8749CF99D88E5F34271D636178FB5D130");
    assert.equal(row.hashcatMode, "300");
    assert.equal(row.hashcatLine, "fcf7c1b8749cf99d88e5f34271d636178fb5d130");
    assert.equal(row.johnLine, "*FCF7C1B8749CF99D88E5F34271D636178FB5D130");
  });

  it("tells 2005 and 2000 MSSQL apart by length", () => {
    const short = "0x010045083578bf13a6e30ca29c40e540813772754d54a5ffd325";
    const long = "0x0100778883860000000000000000000000000000000000000000eda3604e067a06f2732b05b9cb90b8a710996939";
    assert.equal(short.slice(2).length, 52);
    assert.equal(identifyPaste(short)[0].hashcatMode, "132");
    assert.equal(identifyPaste(long)[0].hashcatMode, "131");
    assert.equal(
      identifyPaste(
        "0x02003788006711b2e74e7d8cb4be96b1d187c962c5591a02d5a6ae81b3a4a094b26b7877958b26733e45016d929a756ed30d0a5ee65d3ce1970f9b7bf946e705c595f07625b1",
      )[0].hashcatMode,
      "1731",
    );
  });

  it("does not call a password a hash", () => {
    const [row] = identifyPaste("anita:Summer2024!");
    assert.equal(row.ok, false);
    assert.match(row.note, /password/);
  });

  it("reports a cracked potfile line", () => {
    const [row] = identifyPaste(`${NT}:Password1`);
    assert.equal(row.cracked, "Password1");
    assert.equal(row.hashcatLine, null);
  });
});
