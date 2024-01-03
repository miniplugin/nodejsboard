FROM node:16.14.0
WORKDIR /nodejsboard
#COPY package*.json .
#RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start"]