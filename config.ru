require 'sinatra'

mime_type :less, 'text/css'

get '/' do
  redirect '/index.html'
end

run Sinatra::Application
