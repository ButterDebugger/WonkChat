FROM alpine
RUN apk update
RUN apk add nodejs npm
RUN apk add nginx
WORKDIR /app
COPY . .
EXPOSE 80
RUN chmod +x ./start.sh
CMD ["./start.sh"]