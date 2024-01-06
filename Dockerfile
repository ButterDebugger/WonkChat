FROM nginx:alpine
COPY nginx /etc/nginx
RUN npm run start