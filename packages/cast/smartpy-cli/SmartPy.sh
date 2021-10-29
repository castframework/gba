#!/usr/bin/env bash

set -e

VERSION="0.8.2"
export FORCE_COLOR=1

export smartml_app_name=SmartPy.sh

install_path="$( cd -- "$(dirname $(realpath "$0"))" >/dev/null 2>&1 ; pwd -P )"

usage () {
    echo "Usage:"
    echo "   $0 test        <script> <output> <options>* (execute all test targets)"
    echo "   $0 compile     <script> <output> <options>* (execute all compilation targets)"
    echo "   $0 kind <kind> <script> <output> <options>* (execute all custom targets added by sp.add_target(..., kind=<kind>))"
    echo "   $0 originate-contract --code <file>(.json|.tz) --storage <file>(.json|.tz) --rpc <rpc-url> [--priate-key edsk...]"
    echo
    echo "   Parameters:"
    echo "         <script>              : a script containing SmartPy, SmartTS or SmartML code"
    echo "         <output>              : a directory for the results"
    echo "         <kind>                : a custom target kind"
    echo
    echo "   Options:"
    echo "         --purge               : optional, clean output_directory before running"
    echo "         --html                : optional, add html logs and outputs"
    echo "         --protocol <protocol> : optional, select target protocol - default is granada"
    echo "         --<flag> <arguments>  : optional, set some flag with arguments"
    echo "         --<flag>              : optional, activate some boolean flag"
    echo "         --no-<flag>           : optional, deactivate some boolean flag"
    echo "         --mockup              : optional, run in mockup (experimental, needs installed source)"
    echo "         --sandbox             : optional, run in sandbox (experimental, needs installed source)"
    echo
    echo "   Protocols: delphi | edo | florence | granada | hangzhou"
}


protocol=PtGRANADsDU8R9daYKAgWnQYAJ64omN1o3KMGVCykShA97vQbvV
#alpha: ProtoALphaALphaALphaALphaALphaALphaALphaALphaDdp3zK

native=no
has_mockup=no
has_sandbox=no
args="$@"
set --
for arg in $args
do
    if [[ "$arg" == --native ]]; then
        native=yes
    elif [[ "$arg" == --no-native ]]; then
        native=no
    elif [[ "$arg" == --mockup ]]; then
        has_mockup=yes
    elif [[ "$arg" == --sandbox ]]; then
        has_sandbox=yes
    elif [[ "$arg" == edo ]]; then
        protocol=PtEdo2ZkT9oKpimTah6x2embF25oss54njMuPzkJTEi5RqfdZFA
        set -- "$@" "$arg"
    elif [[ "$arg" == florence ]]; then
        protocol=PsFLorenaUUuikDWvMDr6fGBRG8kt3e3D3fHoXK1j1BFRxeSH4i
        set -- "$@" "$arg"
    elif [[ "$arg" == granada ]]; then
        protocol=PtGRANADsDU8R9daYKAgWnQYAJ64omN1o3KMGVCykShA97vQbvV
        set -- "$@" "$arg"
    elif [[ "$arg" == hangzhou ]]; then
        protocol=PtHangzHogokSuiMHemCuowEavgYTP8J5qQ9fQS793MHYFpCY3r
        set -- "$@" "$arg"
    else
        set -- "$@" "$arg"
    fi
done


if [[ "$native" == yes ]]; then
    smartpyc="$install_path/smartpyc"
else
    smartpyc="node --stack-size=4096 $install_path/smartpyc.js"
fi

action=none
case "$1" in
    "" | "help" | "--help" | "-h")
        usage
        action=exit
        ;;
    --version)
        echo "SmartPy Version: $VERSION"
        action=exit
        ;;
    # Aliases to cli-js commands:
    # If you add more, please update Meta.smartpy_dot_sh_aliases
    # in smartML/cli_js/node_main.ml
    "compile")
        [ "$#" -lt 3 ] && { usage; exit 1; }
        action=regular
        kind=compilation
        shift
        ;;
    "test")
        [ "$#" -lt 3 ] && { usage; exit 1; }
        action=regular
        kind=test
        shift
        ;;
    "kind")
        [ "$#" -lt 4 ] && { usage; exit 1; }
        action=regular
        kind="$2"
        shift 2
        ;;
    "misc")
        shift
        $smartpyc --install $install_path --misc "$@"
        action=exit
        ;;
    "originate-contract")
        "$install_path/originator.js" "$@"
        action=exit
        ;;
    * )
        ;;
esac

case $action in
    "none" )
        echo "SmartPy.sh. Unknown argument: $*"
        usage
        exit 1
        ;;
    "exit" )
        exit 0
        ;;
    "regular" )
        script="$1"
        output="$2"
        shift 2
        if [[ $has_mockup == yes ]]; then
            MOCKUP=$(mktemp -d "_mockup.XXXXXX")
            _build/tezos-bin/tezos-client \
                --protocol $protocol \
                --base-dir $MOCKUP \
                create mockup
            $smartpyc "$script" --kind $kind --output "$output" --install $install_path --mockup $MOCKUP "$@" \
                && rm -rf $MOCKUP
        elif [[ $has_sandbox == yes ]]; then
            scripts/with_sandbox.sh sh -c \
            "$smartpyc $script --kind $kind --output $output --install $install_path $@"
        else
            $smartpyc "$script" --kind $kind --output "$output" --install $install_path "$@"
        fi
        ;;
    * )
        echo "Impossible action"
        exit 1
esac
