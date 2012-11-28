OBJS=json-parser.min.js video.min.js

all: all.js

%.min.js : %.js
	./compress.py $<

all.js: $(OBJS)
	cat $^ > $@

clean:
	rm -rf *.min.js

cleanall:
	rm -rf *.min.js all.js
