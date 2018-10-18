FROM alekzonder/puppeteer
WORKDIR /mnt
COPY package.json /app
RUN sed -i -e s'#"puppeteer": .*##' /app/package.json
RUN cd /app; npm install
COPY index.js /app
COPY run.sh /app
ENTRYPOINT ["/app/run.sh"]
