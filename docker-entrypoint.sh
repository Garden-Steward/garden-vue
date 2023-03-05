#!/bin/sh

SRC=.env
OUTPUT="// generated"

while IFS="" read -r line || [ -n "$line" ]; do
    use_line=$line

    if expr "$line" : "VITE" > /dev/null; then
        ENVIRONMENT_VARIABLE_NAME=$(echo "$line" | sed -re 's/=.*//g')
        value=$(printenv "$ENVIRONMENT_VARIABLE_NAME")

        if [ "${value}" ] && [ "${value-x}" ]; then
            use_line="$ENVIRONMENT_VARIABLE_NAME = '$value';"
        fi
    fi

    OUTPUT="$OUTPUT\n$use_line"
done <$SRC

echo "$OUTPUT" > $SRC

npm run preview