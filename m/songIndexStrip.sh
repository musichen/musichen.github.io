for f in *.*; do
  if [[ "$f" == [0-9][0-9].\ * ]]; then
    new="${f#*. }"
    mv -- "$f" "$new"
  fi
done
