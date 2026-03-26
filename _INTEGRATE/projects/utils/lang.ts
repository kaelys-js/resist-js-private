import { execSync } from "child_process";
import fs from "fs";

function safe(cmd: string) {
    try { return execSync(cmd, { encoding: "utf8" }).trim(); }
    catch { return null; }
}

/* ============================================================
   GO
============================================================ */
export function getGoInfo() {
    return {
        hasGo: !!safe("which go"),
        version: safe("go version"),
        env: safe("go env"),
        gopath: process.env.GOPATH ?? safe("go env GOPATH"),
        goroot: process.env.GOROOT ?? safe("go env GOROOT"),
        modulesEnabled: safe("go env GO111MODULE"),
        compiler: safe("go env CC"),
        os: safe("go env GOOS"),
        arch: safe("go env GOARCH"),
        cgo: safe("go env CGO_ENABLED"),
    };
}

/* ============================================================
   PYTHON
============================================================ */
export function getPythonInfo() {
    return {
        hasPython: !!safe("which python3") || !!safe("which python"),
        version: safe("python3 --version") ?? safe("python --version"),
        executable: safe("which python3") ?? safe("which python"),
        pipVersion: safe("pip3 --version") ?? safe("pip --version"),
        sitePackages: safe("python3 - <<'EOF'\nimport site, json; print(json.dumps(site.getsitepackages()));\nEOF") ?? null,
        venv: process.env.VIRTUAL_ENV ?? null,
        pyenv: process.env.PYENV_VERSION ?? null,
        conda: process.env.CONDA_DEFAULT_ENV ?? null
    };
}

/* ============================================================
   PHP
============================================================ */
export function getPHPInfo() {
    return {
        hasPHP: !!safe("which php"),
        version: safe("php -v"),
        iniFile: safe("php --ini"),
        phpExtensions: safe("php -m"),
        sapi: safe("php -i | grep 'Server API'"),
    };
}

/* ============================================================
   RUBY
============================================================ */
export function getRubyInfo() {
    return {
        hasRuby: !!safe("which ruby"),
        version: safe("ruby -v"),
        gemVersion: safe("gem -v"),
        gems: safe("gem list"),
        rbenv: process.env.RBENV_ROOT ?? null,
        rvm: process.env.rvm_path ?? null
    };
}

/* ============================================================
   PERL
============================================================ */
export function getPerlInfo() {
    return {
        hasPerl: !!safe("which perl"),
        version: safe("perl -v"),
        libs: safe("perl -e 'print join(\"\\n\", @INC)'"),
        perlbrew: process.env.PERLBREW_ROOT ?? null
    };
}

/* ============================================================
   RUST
============================================================ */
export function getRustInfo() {
    return {
        hasRust: !!safe("which rustc"),
        version: safe("rustc --version"),
        cargoVersion: safe("cargo --version"),
        toolchain: safe("rustup show active-toolchain"),
        installedToolchains: safe("rustup toolchain list"),
        targetList: safe("rustup target list"),
        rustupHome: process.env.RUSTUP_HOME ?? null,
        cargoHome: process.env.CARGO_HOME ?? null
    };
}

/* ============================================================
   C (gcc/clang)
============================================================ */
export function getCInfo() {
    return {
        gcc: {
            installed: !!safe("which gcc"),
            version: safe("gcc --version"),
            path: safe("which gcc"),
        },
        clang: {
            installed: !!safe("which clang"),
            version: safe("clang --version"),
            path: safe("which clang"),
        },
        includePaths: safe("echo | gcc -E -Wp,-v - 2>&1") ?? null
    };
}

/* ============================================================
   C++
============================================================ */
export function getCPPInfo() {
    return {
        gplusplus: {
            installed: !!safe("which g++"),
            version: safe("g++ --version"),
            path: safe("which g++")
        },
        clangplusplus: {
            installed: !!safe("which clang++"),
            version: safe("clang++ --version"),
            path: safe("which clang++")
        },
        cppStdlib: safe("echo | g++ -E -Wp,-v - 2>&1") ?? null
    };
}

/* ============================================================
   SWIFT
============================================================ */
export function getSwiftInfo() {
    return {
        hasSwift: !!safe("which swift"),
        swiftVersion: safe("swift --version"),
        swiftcVersion: safe("swiftc --version"),
        sdkPath: safe("xcrun --sdk macosx --show-sdk-path"),
        toolchains: safe("xcode-select -p"),
        packages: safe("swift package describe") ?? null,
    };
}

/* ============================================================
   KOTLIN
============================================================ */
export function getKotlinInfo() {
    return {
        hasKotlin: !!safe("which kotlinc"),
        version: safe("kotlinc -version"),
        compiler: safe("which kotlinc"),
        kotlinHome: process.env.KOTLIN_HOME ?? null,
        gradleKotlin: safe("gradle -q kotlinDslAccessorsReport") ?? null
    };
}

/* ============================================================
   SCALA
============================================================ */
export function getScalaInfo() {
    return {
        hasScala: !!safe("which scala"),
        scalaVersion: safe("scala -version"),
        scalacVersion: safe("scalac -version"),
        sbt: safe("sbt sbt-version"),
        scalaHome: process.env.SCALA_HOME ?? null
    };
}

/* ============================================================
   ELIXIR / ERLANG (BEAM)
============================================================ */
export function getElixirInfo() {
    return {
        hasElixir: !!safe("which elixir"),
        elixirVersion: safe("elixir -v"),
        erlangVersion: safe("erl -eval 'erlang:display(erlang:system_info(otp_release)), halt().' -noshell"),
        mixVersion: safe("mix -v"),
        hexVersion: safe("mix hex.info"),
        rebar: safe("rebar3 --version")
    };
}

/* ============================================================
   HASKELL
============================================================ */
export function getHaskellInfo() {
    return {
        hasGHC: !!safe("which ghc"),
        ghcVersion: safe("ghc --version"),
        cabalVersion: safe("cabal --version"),
        stackVersion: safe("stack --version"),
        ghcup: process.env.GHCUP_INSTALL_BASE ?? null
    };
}

/* ============================================================
   LUA
============================================================ */
export function getLuaInfo() {
    return {
        hasLua: !!safe("which lua"),
        luaVersion: safe("lua -v"),
        luarocks: safe("luarocks --version"),
        rocksList: safe("luarocks list"),
    };
}

/* ============================================================
   SHELL (bash, zsh, fish, etc.)
============================================================ */
export function getShellInfo() {
    return {
        shell: process.env.SHELL ?? null,
        bashVersion: safe("bash --version"),
        zshVersion: safe("zsh --version"),
        fishVersion: safe("fish --version"),
        shellConfig: {
            bashrc: fs.existsSync("~/.bashrc"),
            zshrc: fs.existsSync("~/.zshrc"),
            fishConfig: fs.existsSync("~/.config/fish/config.fish"),
        }
    };
}

/* ============================================================
   SQL (Postgres, MySQL, SQLite)
============================================================ */
export function getSQLInfo() {
    return {
        postgres: {
            installed: !!safe("which psql"),
            version: safe("psql --version"),
            service: safe("pg_isready"),
        },
        mysql: {
            installed: !!safe("which mysql"),
            version: safe("mysql --version")
        },
        sqlite: {
            installed: !!safe("which sqlite3"),
            version: safe("sqlite3 --version")
        }
    };
}

/* ============================================================
   R
============================================================ */
export function getRInfo() {
    return {
        hasR: !!safe("which R"),
        version: safe("R --version"),
        packages: safe("R -q -e 'installed.packages()[,1]'"),
    };
}

/* ============================================================
   JULIA
============================================================ */
export function getJuliaInfo() {
    return {
        hasJulia: !!safe("which julia"),
        version: safe("julia -v"),
        packages: safe("julia -q -e 'using Pkg; Pkg.status()'"),
    };
}

/* ============================================================
   CRYSTAL
============================================================ */
export function getCrystalInfo() {
    return {
        hasCrystal: !!safe("which crystal"),
        version: safe("crystal --version"),
        shards: safe("shards --version"),
    };
}

/* ============================================================
   NIM
============================================================ */
export function getNimInfo() {
    return {
        hasNim: !!safe("which nim"),
        version: safe("nim -v"),
        nimsuggest: safe("which nimsuggest"),
    };
}

/* ============================================================
   ZIG
============================================================ */
export function getZigInfo() {
    return {
        hasZig: !!safe("which zig"),
        version: safe("zig version"),
        targets: safe("zig targets"),
    };
}

/* ============================================================
   JVM (java, scala, kotlin) COMBINED
============================================================ */
export function getJVMInfo() {
    return {
        java: getJavaInfo(),
        kotlin: getKotlinInfo(),
        scala: getScalaInfo()
    };
}

/* ============================================================
   JAVA / JVM BASE
============================================================ */
export function getJavaInfo() {
    return {
        hasJava: !!safe("which java"),
        javaVersion: safe("java -version"),
        javacVersion: safe("javac -version"),
        javaHome: process.env.JAVA_HOME ?? safe("/usr/libexec/java_home") ?? null,
        maven: safe("mvn -v"),
        gradle: safe("gradle -v"),
        jarsInProject: safe("find . -name '*.jar' | wc -l"),
        runtimeVM: safe("java -XshowSettings:properties -version")
    };
}

/* ============================================================
   C# / .NET / F# / VB.NET
============================================================ */
export function getDotNetInfo() {
    return {
        hasDotnet: !!safe("which dotnet"),
        version: safe("dotnet --version"),
        sdks: safe("dotnet --list-sdks"),
        runtimes: safe("dotnet --list-runtimes"),
        languages: {
            csharp: true,
            fsharp: !!safe("dotnet fsi --version"),
            vb: !!safe("dotnet new vb")
        }
    };
}

/* ============================================================
   FINAL BUNDLE — EVERYTHING
============================================================ */

export function getAllLanguageInfo() {
    return {
        go: getGoInfo(),
        python: getPythonInfo(),
        php: getPHPInfo(),
        ruby: getRubyInfo(),
        perl: getPerlInfo(),
        rust: getRustInfo(),
        c: getCInfo(),
        cpp: getCPPInfo(),
        swift: getSwiftInfo(),
        kotlin: getKotlinInfo(),
        scala: getScalaInfo(),
        elixir: getElixirInfo(),
        haskell: getHaskellInfo(),
        lua: getLuaInfo(),
        shell: getShellInfo(),
        sql: getSQLInfo(),
        r: getRInfo(),
        julia: getJuliaInfo(),
        crystal: getCrystalInfo(),
        nim: getNimInfo(),
        zig: getZigInfo(),
        java: getJavaInfo(),
        jvm: getJVMInfo(),
        dotnet: getDotNetInfo()
    };
}