from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "users" ALTER COLUMN "role" TYPE VARCHAR(11) USING "role"::VARCHAR(11);
        UPDATE "users" SET "role" = 'user' WHERE "role" = 'shopper';
        UPDATE "users" SET "role" = 'store_admin' WHERE "role" = 'operator';
        UPDATE "users" SET "role" = 'super_admin' WHERE "role" = 'admin';
        ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';
        COMMENT ON COLUMN "users"."role" IS 'user: user
store_admin: store_admin
super_admin: super_admin';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        UPDATE "users" SET "role" = 'shopper' WHERE "role" = 'user';
        UPDATE "users" SET "role" = 'operator' WHERE "role" = 'store_admin';
        UPDATE "users" SET "role" = 'admin' WHERE "role" = 'super_admin';
        ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'shopper';
        COMMENT ON COLUMN "users"."role" IS 'shopper: shopper
operator: operator
admin: admin';
        ALTER TABLE "users" ALTER COLUMN "role" TYPE VARCHAR(8) USING "role"::VARCHAR(8);"""


MODELS_STATE = (
    "eJztXVtv4jgU/itRnjoSWxXauaHVSrSlO+z2Mmrp7miGETKJoVYTO5M4bdlR//vauSd2KD"
    "BcEuqXEI594vg7vpzz2Zifuk1MaHn7J4DCCXGnelv7qWNgQ3YjpDU0HThOmsIFFIysILMR"
    "5kIwEIORR11gUJYyBpYHmciEnuEihyKCmRT7lsWFxGAZEZ6kIh+jHz4cUjKB9A66LOHbdy"
    "ZG2IRP7OHRV+d+OEbQMnMvjExediAf0qkTyG5ve6dnQU5e3GhoEMu3cZrbmdI7gpPsvo/M"
    "fa7D0yYQQ5fVy8xUg79lVOdYFL4xE1DXh8mrmqnAhGPgWxwM/fexjw2OgRaUxC9Hf+gLwG"
    "MQzKFFmHIsfj6HtUrrHEh1XtTJp8713uG7N0EtiUcnbpAYIKI/B4qAglA1wDUF0nAhr/YQ"
    "UBHQU5ZCkQ3loOY1C+Cakep+fLMMyLEgRTltYTHMMXzLYaqzOphX2JpGFpyBcb930b3pdy"
    "4+85rYnvfDCiDq9Ls8pRVIpwXpXmgSwvpH2HWSh2j/9vqfNP5V+3p12S0aLsnX/6rzdwI+"
    "JUNMHofAzDS2WBoDw3KmhvUdc0nD5jWVYbdq2OjlU7sGn4JFT+6AK7dmnL9gRwZWRS1ng6"
    "ehBfGE3rGvzdaHGab7p3MdDH0sV8Eel1FSK0x7zkHoWf5kEQjj/KuB8OWpo5IA8ql4fJ+Z"
    "Q7hgBIz7R+Caw1xKirTjEtM3qCeifRxpnv19DS0Q1FFEOHJLPodPmQPsCMoNNtfnuLHEUl"
    "mf9Shx4S+CcMOfUS8IeAshLVLWZsQku2UXJQCDSfDWvGxeUuyqEjyBHn/V7gMMihS92UKW"
    "2U5tknkIeW7l2yrfVrlAlXCBlG+7o4YV5kliGL4DsDEVzdrDVG7RnE7BoAjP4zRsw4QTXs"
    "5vrebR+6MPh++OPrAswbskkvczrNq77Bc8WovNWZbcpe1i3w6Q67E3YDhBAcFEecshgm6R"
    "x7bGLgNsQxP5dlsLPwf4Dk3u2hq/DjDToMgAVluL7/Ql/OJ5vOJyn1gIKVxoENdcakgqqK"
    "oxqWKTzX8Ew+FiPllGZZWO2cZc+SX8MCE8zAMoonfGwhk0wX/DqTA6yQOgr9FjKouaEAAx"
    "sQseEw8/2yxY9VilIA2H6c7NSee0qz+Xh9TrDKXOgIEsRKc9zwsAEwKpfIbGrDBqHGUdIp"
    "5XBVEqiFLzWkXnNRVE7YRhhSCKImottEKQKNRziaD19u0cvjzLVerNB2l5fz77ZgKUffhU"
    "EowW1DYHqL6eeaPf/dLPtfoYtL2Lzpc3uZZ/fnX5Z5w9A/LJ+dVxAdvERwhwkTbUl4NW4S"
    "EbxJoEzogAuM4cugdAidvW4rsBZjmAFQnjWxbPPgCDxbPsOsAWi2opsw8LfaO7AXZYNUeB"
    "LL4b4KDUtpYWvmA/+ThHL/lY2kc+Coto8AGy+FtC1cxnwKz+Bm0XMgoS49WYfGAIU1+yvD"
    "SnIRLtTXYhB2KJEbiYNXF2HWCEh45L+LzotbXMlwFmV2I9QLOtxXfLGKHZnGdhtFm+LtoU"
    "SSCHuMu5VAVV5VNVzFmOG9pSps2prsC0W1virbol42pXk8+rlNnqQudVZztDY04276bb1y"
    "5vz8+3RefFu2UkRF5mI005hZfds6O4O8XdKXekeu6I4u52wrCvfHOvYu70ejF3josMSfs8"
    "hQaygSUHNtEpjjWh0n6kXM32OgPg0+5J76Jzvtc8aLQCPBmaKPQAY6SPDoqNE+GhR4lxL2"
    "J4TIgFAS5xcTJqBRhHTG9d2CVuz6qxO766Os81zuNesfXdXhx3r/eaBWTFnU8UTCTM1183"
    "V5clix1R/gKMt5jV7puJDNrQLOTR72vr7qnnOPKRRRH29nmBa3IeORCzh4Fijy/MafwBxW"
    "HAhhRwn3MR3LM6VcKeF1sn7KMfX04XZDAKaq+ExRB+g7EgalkdtZErhGMF1M+8P2Wp8Fau"
    "bMuQ7+WSddoVYJf9iXZVe+qL6BVGo6rRZzaJKi4j0KLExgsUWphNkWiKRFNcSyW4FkWi7a"
    "hh1QY4RaPVi0YzkWcQH9OhY8iGnllsWlF1R0m1twtwasxjdqm3xCieU6znIF6TQXuufRkQ"
    "m8tYMaOmbLhtGyJmCubRP0im39kEd1ZPMdyKuFLE1daIq+3QLiG0EsolwbycbkmP11FUi6"
    "JaausI7ExErqiWHTWs2q+kiJY6ES1jixBXRLX0LKEk/2s9R4i9Oh1i3x5BCWzl3bqgVs/e"
    "fdiao3Mftkr7Nk9SezV+wS+swE90diXgVUfuvPAjHbVNYwPbNLZ3DnCFWmRhA3V2Y8gvIZ"
    "HuQ6kRFutkkG69gLURCKRA3pjFH/ksh6KPFH2kWIZKsAyKPtpRwwrTISvQvZc6+uWxZlbn"
    "Vf8hQ27t3Aao5PzfklXzWKGOEK6Fh3NJ2aaxl4/QiXU3yML5nvQIKi5ua/w6wOFSHzBthN"
    "ta5gtL8R3oJinpF32Z9rySY3SEWHY7q5BBwCvxIeNAuNyH5IGm8iGVD6lcjUq4GsqH3FHD"
    "vvIlyLV4j2qZbMFlMgM4wJCefVmKWVZly7DpF+BJ88AYarn/TtkMjAs4ehm8ZX/OtTx7Kv"
    "ljsOq12bn4ZMlx+8vDIhzzX5uFC3G/7Ib+bK9K7WKdcVEHusi40yWRUZTSmBUbgTRPZYKj"
    "0oFaGhtJhuio9W+VFVnJtFYeCz1A15NuSyr3rjIq9XSw1sIt8a6xAIhR9noC2Dw4mMdDPT"
    "go91APhN94sRJpNFPnQSw/cCajsq3zZta2MWRlJ8tslXZ7/h9dS4L/"
)
