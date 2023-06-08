"use client";

import BasicDatePicker from "@/components/BasicDatePicker";
import { cpfMask, phoneNumberMask } from "@/utils/mask";

import { Button, FormControl, FormControlLabel, FormLabel, Grid, IconButton, InputAdornment, InputLabel, OutlinedInput, Radio, RadioGroup, Stack, Step, StepLabel, Stepper, TextField } from "@mui/material";
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Visibility from '@mui/icons-material/Visibility';
import { useState } from "react";
import { useForm } from "react-hook-form";

const steps = [
  'Dados Pessoas',
  'Endereço',
  'Informações de acesso',
];
console.log(phoneNumberMask("041999714703"))

export default function Home(): JSX.Element {
  const { control, handleSubmit } = useForm();
  const [phone, setPhone] = useState("");
  const [cpf, setCPF] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = data => { console.log(data); };
  
  const handleNextActiveStep = (): void => {
    setActiveStep(state => state+1);
    if(activeStep === 3) {
      // executar função de finalização
    }
  }

  const handlePrevActiveStep = (): void => {
    setActiveStep(state => state-1);
  }

  return  (
    <Grid container className='p-2 bg-white flex justify-center items-center h-screen'>
      <Stack className='border-gray-500 border flex' direction='column' columnGap={1}>
      <h1>Cadastre-se na nossa plataforma</h1>

      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <form className='flex gap-2 flex-col my-8'>  
        {
          activeStep === 0 && <><TextField control id='outlined-basic' error helperText='Só pode conter letras' label='Nome' variant='outlined' required />

          <TextField id='outlined-basic' label='Sobrenome' variant='outlined' required/>
  
          <TextField  variant='outlined' value={phoneNumberMask(phone)} onChange={(e) => { setPhone(e.target.value); }} id='outlined-require' label='Telefone' required  />
  
          <TextField id='outlined-basic' label='CPF' variant='outlined' required value={cpfMask(cpf)} onChange={(e) => { setCPF(e.target.value); }}/>
  
          <BasicDatePicker/>
  
  
          <FormControl>
            <FormLabel id='demo-radio-buttons-group-label'>Gênero</FormLabel>
            <RadioGroup
              row
              aria-labelledby='demo-radio-buttons-group-label'
              defaultValue='male'
              name='radio-buttons-group'
            >
              <FormControlLabel value='female' control={<Radio />} label='Feminino' />
              <FormControlLabel value='male' control={<Radio />} label='Masculino' />
              <FormControlLabel value='other' control={<Radio />} label='Outro' />
            </RadioGroup>
        </FormControl></>
        }

        {
          activeStep === 1 && 
          <>
            <TextField id='outlined-basic' label='CEP' variant='outlined' required/>
            <TextField id='outlined-basic' label='Cidade' variant='outlined' required/>
            <TextField id='outlined-basic' label='UF' variant='outlined' required/>
            <TextField id='outlined-basic' label='Bairro' variant='outlined' required/>
            <TextField id='outlined-basic' label='Rua' variant='outlined' required/>
            <TextField id='outlined-basic' label='Número' variant='outlined' required/>
            <TextField id='outlined-basic' label='Complemento' variant='outlined'/>

          </>
        }

        {
          activeStep === 2 && 
          <>
            <TextField id='outlined-basic' label='E-mail' variant='outlined' required/>
            
            <FormControl  variant='outlined'>
              <InputLabel htmlFor='outlined-adornment-password'>Senha *</InputLabel>
              <OutlinedInput
                required
                id='outlined-adornment-password'
                type={showPassword ? 'text' : 'password'}
                endAdornment={
                  <InputAdornment position='end'>
                    <IconButton
                      aria-label='toggle password visibility'
                      onClick={() => { setShowPassword(state => !state); }}
                      edge='end'
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                label='Password'
              />
            </FormControl>


            <FormControl  variant='outlined'>
            <InputLabel htmlFor='outlined-adornment-password-confirm'>Confirmar senha *</InputLabel>
              <OutlinedInput
                required
                id='outlined-adornment-password-confirm'
                type={showPassword ? 'text' : 'password'}
                endAdornment={
                  <InputAdornment position='end'>
                    <IconButton
                      aria-label='toggle password visibility'
                      onClick={() => { setShowPassword(state => !state); }}
                      edge='end'
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                label='Password'
              />
            </FormControl>
          </>
        }

      <div className='flex gap-8 justify-end'>
      {activeStep !== 0 && <Button onClick={handlePrevActiveStep}>
              Voltar
      </Button>}
      <Button onClick={handleNextActiveStep}>
              {activeStep === steps.length - 1 ? 'Finalizar' : 'Proximo'}
      </Button>
      </div>
      </form>
      </Stack>
    </Grid>
  );
}