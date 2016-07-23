/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../pkcs11.d.ts" />

const pkcs11 = require("../index");
const assert = require("assert");

// const libPath = "C:\\tmp\\rtpkcs11ecp.dll";
const libPath = "/usr/local/lib/softhsm/libsofthsm2.so";
// const libPath = "/usr/safenet/lunaclient/lib/libCryptoki2_64.so";

const tokenPin = "12345";
const slot_index = 0;

const mod_assert = "Module is not initialized";
const slot_assert = "Slot is not found";
const session_assert = "Session is not opened";
const private_assert = "Private key is not created";
const public_assert = "Private key is not created";
const secret_aes_assert = "Secret key is not created";

describe("PKCS11", () => {

    var _mod, _slot, _session, _privateKey, _publicKey, _secretKey,
        _privateKeyEC, _publicKeyEC;

    after(() => {
        if (_session !== void 0) {
            _mod.C_Logout(_session);
            _mod.C_CloseSession(_session);
        }
        if (_mod)
            _mod.C_Finalize();
    });

    context("Module", () => {

        it("load from wrong pkcs11 library", () => {
            var mod = new pkcs11.PKCS11();
            assert.throws(() => {
                mod.load("some/wrong/lib");
            }, "Must be error on usin wrong lib");
        });

        it("check correct lib", () => {
            var mod = new pkcs11.PKCS11();
            mod.load(libPath);
            assert.equal(!!mod, true);
            _mod = mod;
        });

        it("get Info", () => {
            assert.equal(!!_mod, true, mod_assert);

            _mod.C_Initialize();

            var info = _mod.C_GetInfo();

            assert.equal(!!info.cryptokiVersion, true);
            assert.equal(!!info.manufacturerID, true);
            assert.equal(info.flags, 0);
            assert.equal(!!info.libraryDescription, true);
            assert.equal(!!info.libraryVersion, true);
        });

    });

    context("Slot", () => {

        it("get list", () => {
            assert.equal(!!_mod, true, mod_assert);

            var slots = _mod.C_GetSlotList(true);
            assert.equal(!!slots.length, true);
            _slot = slots[slot_index];
        });

        it("get info", () => {
            assert.equal(!!_mod, true, mod_assert);
            assert.notEqual(_slot, undefined, slot_assert);

            var info = _mod.C_GetSlotInfo(_slot);

            assert.equal(!!info.slotDescription, true);
            assert.equal(!!info.manufacturerID, true);
            assert.equal(!!info.flags, true);
            assert.equal(!!info.hardwareVersion, true);
            assert.equal(!!info.firmwareVersion, true);
        });

        it("get Token Info", () => {
            assert.equal(!!_mod, true, mod_assert);
            assert.notEqual(_slot, undefined, slot_assert);

            var info = _mod.C_GetTokenInfo(_slot);

            assert.equal(!!info.label, true);
            assert.equal(!!info.manufacturerID, true);
            assert.equal(!!info.model, true);
            assert.equal(!!info.serialNumber, true);
            assert.equal("flags" in info, true);
            assert.equal("maxSessionCount" in info, true);
            assert.equal("sessionCount" in info, true);
            assert.equal("maxRwSessionCount" in info, true);
            assert.equal("rwSessionCount" in info, true);
            assert.equal("maxPinLen" in info, true);
            assert.equal("hardwareVersion" in info, true);
            assert.equal("firmwareVersion" in info, true);
            assert.equal("utcTime" in info, true);
        });

        it("get Mechanism Info", () => {
            assert.equal(!!_mod, true, mod_assert);
            assert.notEqual(_slot, undefined, slot_assert);

            var list = _mod.C_GetMechanismList(_slot);

            assert.equal(!!list.length, true);

            var info = _mod.C_GetMechanismInfo(_slot, list[0]);

            assert.equal("minKeySize" in info, true);
            assert.equal("maxKeySize" in info, true);
            assert.equal("flags" in info, true);
        });

    });

    context("Session", () => {

        it("open", () => {
            assert.equal(!!_mod, true, mod_assert);
            assert.notEqual(_slot, undefined, slot_assert);

            _session = _mod.C_OpenSession(_slot, 2 | 4);

            assert.notEqual(_session, undefined, session_assert);
        });

        it("get Info", () => {
            assert.equal(!!_mod, true, mod_assert);
            assert.notEqual(_session, undefined, session_assert);

            var info = _mod.C_GetSessionInfo(_session);

            assert.equal("slotID" in info, true);
            assert.equal("state" in info, true);
            assert.equal("flags" in info, true);
            assert.equal("deviceError" in info, true);
        });

        it("login", () => {
            assert.equal(!!_mod, true, mod_assert);
            assert.notEqual(_session, undefined, session_assert);
            _mod.C_Login(_session, 1, tokenPin);
        });

        it("seed random", () => {
            var inBuf = new Buffer(20);
            var outBuf = _mod.C_SeedRandom(_session, inBuf);
            assert.equal(inBuf, outBuf, "Out buffer is a point to incoming");
            assert.equal(inBuf.length, 20);
        });

        it("generate random", () => {
            var inBuf = new Buffer(20);
            var outBuf = _mod.C_GenerateRandom(_session, inBuf);
            assert.equal(inBuf, outBuf, "Out buffer is a point to incoming");
            assert.equal(inBuf.length, 20);
        });

        it("generate key", () => {
            var template = [
                { type: _mod.CKA_CLASS, value: _mod.CKO_SECRET_KEY },
                { type: _mod.CKA_TOKEN, value: false },
                { type: _mod.CKA_LABEL, value: "My AES Key" },
                { type: _mod.CKA_VALUE_LEN, value: 256 / 8 },
                { type: _mod.CKA_ENCRYPT, value: true },
                { type: _mod.CKA_DECRYPT, value: true },
            ];
            var key = _mod.C_GenerateKey(_session, { mechanism: _mod.CKM_AES_KEY_GEN }, template);
            assert.equal(!!key, true);
            _secretKey = key;
        });

        it("generate key pair RSA", () => {
            var publicKeyTemplate = [
                { type: _mod.CKA_CLASS, value: _mod.CKO_PUBLIC_KEY },
                { type: _mod.CKA_TOKEN, value: false },
                { type: _mod.CKA_LABEL, value: "My RSA Public Key" },
                { type: _mod.CKA_PUBLIC_EXPONENT, value: new Buffer([1, 0, 1]) },
                { type: _mod.CKA_MODULUS_BITS, value: 1024 },
                { type: _mod.CKA_VERIFY, value: true }
            ];
            var privateKeyTemplate = [
                { type: _mod.CKA_CLASS, value: _mod.CKO_PRIVATE_KEY },
                { type: _mod.CKA_TOKEN, value: false },
                { type: _mod.CKA_LABEL, value: "My RSA Private Key" },
                { type: _mod.CKA_SIGN, value: true },
            ];
            var keys = _mod.C_GenerateKeyPair(_session, { mechanism: _mod.CKM_RSA_PKCS_KEY_PAIR_GEN }, publicKeyTemplate, privateKeyTemplate);
            assert.equal(!!keys, true);
            assert.equal("privateKey" in keys, true);
            assert.equal(!!keys.privateKey, true);
            assert.equal("publicKey" in keys, true);
            assert.equal(!!keys.publicKey, true);
            _privateKey = keys.privateKey;
            _publicKey = keys.publicKey;
        }).timeout(20000);

        it("generate key pair EC", () => {
            var publicKeyTemplate = [
                { type: _mod.CKA_CLASS, value: _mod.CKO_PUBLIC_KEY },
                { type: _mod.CKA_TOKEN, value: false },
                { type: _mod.CKA_LABEL, value: "My EC Public Key" },
                { type: _mod.CKA_EC_PARAMS, value: new Buffer("06082A8648CE3D030107", "hex") },
            ];
            var privateKeyTemplate = [
                { type: _mod.CKA_CLASS, value: _mod.CKO_PRIVATE_KEY },
                { type: _mod.CKA_TOKEN, value: false },
                { type: _mod.CKA_LABEL, value: "My EC Private Key" },
                { type: _mod.CKA_DERIVE, value: true },
            ];
            var keys = _mod.C_GenerateKeyPair(_session, { mechanism: _mod.CKM_EC_KEY_PAIR_GEN }, publicKeyTemplate, privateKeyTemplate);
            assert.equal(!!keys, true);
            assert.equal("privateKey" in keys, true);
            assert.equal(!!keys.privateKey, true);
            assert.equal("publicKey" in keys, true);
            assert.equal(!!keys.publicKey, true);
            _privateKeyEC = keys.privateKey;
            _publicKeyEC = keys.publicKey;
        });

        context("Object", () => {

            var _nObject;
            var _nObjetcLabel = "My custom Object";

            var object_assert = "Object is not found";

            it("create", () => {
                assert.equal(!!_mod, true, mod_assert);
                assert.notEqual(_session, undefined, session_assert);
                _nObject = _mod.C_CreateObject(_session, [
                    { type: _mod.CKA_CLASS, value: _mod.CKO_DATA },
                    { type: _mod.CKA_TOKEN, value: false },
                    { type: _mod.CKA_PRIVATE, value: false },
                    { type: _mod.CKA_LABEL, value: _nObjetcLabel },
                ]);

                assert.equal(!!_nObject, true);
            });

            it("get Attribute", () => {
                assert.equal(!!_mod, true, mod_assert);
                assert.notEqual(_session, undefined, session_assert);
                assert.notEqual(_nObject, undefined, object_assert);

                var label = _mod.C_GetAttributeValue(_session, _nObject, [{ type: _mod.CKA_LABEL }]);

                assert.equal(label[0].value.toString(), _nObjetcLabel);
            });

            it("get Attribute list", () => {
                assert.equal(!!_mod, true, mod_assert);
                assert.notEqual(_session, undefined, session_assert);
                assert.notEqual(_nObject, undefined, object_assert);

                var label = _mod.C_GetAttributeValue(_session, _nObject, [
                    { type: _mod.CKA_LABEL },
                    { type: _mod.CKA_CLASS },
                    { type: _mod.CKA_TOKEN }
                ]);

                assert.equal(label.length, 3);
            });

            it("set Attribute", () => {
                assert.equal(!!_mod, true, mod_assert);
                assert.notEqual(_session, undefined, session_assert);
                assert.notEqual(_nObject, undefined, object_assert);

                _mod.C_SetAttributeValue(_session, _nObject, [{ type: _mod.CKA_LABEL, value: _nObjetcLabel + "!!!" }]);
                var label = _mod.C_GetAttributeValue(_session, _nObject, [{ type: _mod.CKA_LABEL }]);

                assert.equal(label[0].value.toString(), _nObjetcLabel + "!!!");
            });

            it("find without search params", () => {
                assert.equal(!!_mod, true, mod_assert);
                assert.notEqual(_session, undefined, session_assert);

                _mod.C_FindObjectsInit(_session);
                var hObject = _mod.C_FindObjects(_session);
                _mod.C_FindObjectsFinal(_session);
                assert.equal(!!hObject, true);
            })

            it("find with search params", () => {
                assert.equal(!!_mod, true, mod_assert);
                assert.notEqual(_session, undefined, session_assert);

                _mod.C_FindObjectsInit(_session, [{ type: _mod.CKA_CLASS, value: _mod.CKO_DATA }]);
                var hObject = _mod.C_FindObjects(_session);
                _mod.C_FindObjectsFinal(_session);
                assert.equal(!!hObject, true);
                var obj_class = _mod.C_GetAttributeValue(_session, _nObject, [{ type: _mod.CKA_CLASS }]);
                assert.equal(obj_class[0].value.readUInt32LE(), _mod.CKO_DATA);
            })
        });
    });

    context("Crypto", () => {

        it("digest", () => {
            assert.equal(!!_mod, true, mod_assert);
            assert.notEqual(_session, undefined, session_assert);

            _mod.C_DigestInit(_session, { mechanism: _mod.CKM_SHA256 });
            _mod.C_DigestUpdate(_session, new Buffer("Hello my test"));
            _mod.C_DigestUpdate(_session, new Buffer("!!!"));
            const digest_size = 32;
            var digest = _mod.C_DigestFinal(_session, Buffer(digest_size + 10));

            assert.equal(digest.length, digest_size);
            assert.equal(digest.toString("hex"), "557685952545061c49b04f4c0658496f56da5d8858f6dad5540eb10885dc7736");
        });

        it("encrypt/decrypt", () => {
            assert.equal(!!_mod, true, mod_assert);
            assert.notEqual(_session, undefined, session_assert);
            assert.notEqual(_privateKey, undefined, private_assert);
            assert.notEqual(_publicKey, undefined, public_assert);

            var crypto_param = new Buffer([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

            _mod.C_EncryptInit(
                _session,
                {
                    mechanism: _mod.CKM_AES_CBC,
                    parameter: crypto_param
                },
                _secretKey
            );
            var enc = new Buffer(0);
            enc = Buffer.concat([enc, _mod.C_EncryptUpdate(_session, new Buffer("1234567812345678"), new Buffer(200))]);
            enc = Buffer.concat([enc, _mod.C_EncryptUpdate(_session, new Buffer("1234567812345678"), new Buffer(200))]);
            const enc_size = 32;
            enc = Buffer.concat([enc, _mod.C_EncryptFinal(_session, new Buffer(16))]);
            assert.equal(enc_size, enc.length);

            // Correct decrypt
            _mod.C_DecryptInit(
                _session,
                {
                    mechanism: _mod.CKM_AES_CBC,
                    parameter: crypto_param
                },
                _secretKey
            );
            var dec = new Buffer(0);
            dec = Buffer.concat([dec, _mod.C_DecryptUpdate(_session, enc, new Buffer(200))]);
            dec = Buffer.concat([dec, _mod.C_DecryptFinal(_session, new Buffer(16))]);
            assert.equal(32, dec.length);
            assert.equal(dec.toString(), "12345678123456781234567812345678");


            // Not correct signature
            _mod.C_DecryptInit(
                _session,
                {
                    mechanism: _mod.CKM_AES_CBC,
                    parameter: crypto_param
                },
                _secretKey
            );
            var dec = new Buffer(0);
            dec = Buffer.concat([dec, _mod.C_DecryptUpdate(_session, new Buffer("Wrong data______Wrong data______"), new Buffer(200))]);
            dec = Buffer.concat([dec, _mod.C_DecryptFinal(_session, new Buffer(16))]);
            assert.notEqual(dec.toString(), "12345678123456781234567812345678");
        });

        it("sign/verify", () => {
            assert.equal(!!_mod, true, mod_assert);
            assert.notEqual(_session, undefined, session_assert);
            assert.notEqual(_privateKey, undefined, private_assert);
            assert.notEqual(_publicKey, undefined, public_assert);

            _mod.C_SignInit(_session, { mechanism: _mod.CKM_SHA256_RSA_PKCS }, _privateKey);
            _mod.C_SignUpdate(_session, new Buffer("Hello my test"));
            _mod.C_SignUpdate(_session, new Buffer("!!!"));
            const signature_size = 256;
            var signature = _mod.C_SignFinal(_session, Buffer(signature_size + 10));

            // Correct signature
            _mod.C_VerifyInit(_session, { mechanism: _mod.CKM_SHA256_RSA_PKCS }, _publicKey);
            _mod.C_VerifyUpdate(_session, new Buffer("Hello my test"));
            _mod.C_VerifyUpdate(_session, new Buffer("!!!"));
            var verify = _mod.C_VerifyFinal(_session, signature);
            assert.equal(verify, true);

            // Not correct signature
            _mod.C_VerifyInit(_session, { mechanism: _mod.CKM_SHA256_RSA_PKCS }, _publicKey);
            _mod.C_VerifyUpdate(_session, new Buffer("Hello my test"));
            _mod.C_VerifyUpdate(_session, new Buffer("!!!<Error here"));
            assert.throws(() => { _mod.C_VerifyFinal(_session, signature); }, "Signed content is not right, MUST be CKR_SIGNATURE_INVALID error here");
        });

        it("derive key", () => {
            assert.equal(!!_mod, true, mod_assert);
            assert.notEqual(_session, undefined, session_assert);
            assert.notEqual(_privateKeyEC, undefined, private_assert);
            assert.notEqual(_publicKeyEC, undefined, public_assert);

            var crypto_param = new Buffer([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

            var attrs = _mod.C_GetAttributeValue(_session, _publicKeyEC, [{ type: _mod.CKA_EC_POINT }])
            var ec = attrs[0].value;
            console.log(ec.toString("hex"));
            var derivedKey = _mod.C_DeriveKey(
                _session,
                {
                    mechanism: _mod.CKM_ECDH1_DERIVE,
                    parameter: {
                        kdf: 2,
                        publicData: ec
                    }
                },
                _privateKeyEC,
                [
                    {type: _mod.CKA_CLASS, value: _mod.CKO_SECRET_KEY},
                    {type: _mod.CKA_TOKEN, value: false},
                    {type: _mod.CKA_KEY_TYPE, value: _mod.CKK_AES},
                    {type: _mod.CKA_LABEL, value: "Derived key"},
                    {type: _mod.CKA_ENCRYPT, value: true},
                    {type: _mod.CKA_VALUE_LEN, value: 256 / 8}
                ],
                new Buffer(32)
            );

            // assert.notEqual(dec.toString(), "12345678123456781234567812345678");
        });

    })
});