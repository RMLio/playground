# To add the examples to ../examples.json

```
chmod 744 ./make-examples.sh #once
./make_examples.sh
```

# Open issues
- in RML_LV2 leftJoin generates errors in Burp: https://github.com/kg-construct/BURP/issues/20
- RML-Star example and RML-IO target example is not working correctly: contacted Christophe, awaiting his reaction before creating issue
- Burp requires 'a rml:TriplesMap' when the TriplesMap is referred to as ParentTriplesMap: https://github.com/kg-construct/BURP/issues/21
  